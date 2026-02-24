from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Set
import json
import os

CONFIG_FILE = "unified_docs.json"
DEFAULT_SKIP_DIRS = {".venv", ".git", "site", "docs", "__pycache__"}


@dataclass
class ReadmeDoc:
    path: Path
    rel_dir: str


@dataclass
class UnifiedConfig:
    skip_dirs: Set[Path]
    project_github: Dict[str, str]
    github_username: str | None
    include_public_repos: bool


def load_config(repo_root: Path) -> UnifiedConfig:
    cfg_path = repo_root / CONFIG_FILE
    skip_dirs: Set[Path] = set()
    project_github: Dict[str, str] = {}
    github_username: str | None = None
    include_public_repos = False

    if cfg_path.exists():
        try:
            raw = json.loads(cfg_path.read_text(encoding="utf-8"))
            if isinstance(raw, dict):
                for rel in raw.get("skip_projects", []):
                    if isinstance(rel, str):
                        skip_dirs.add((repo_root / rel).resolve())

                github_map = raw.get("project_github", {})
                if isinstance(github_map, dict):
                    project_github = {
                        str(key): str(value)
                        for key, value in github_map.items()
                        if isinstance(key, str) and isinstance(value, str)
                    }

                raw_username = raw.get("github_username")
                if isinstance(raw_username, str) and raw_username.strip():
                    github_username = raw_username.strip()

                raw_include_public = raw.get("include_public_repos")
                if isinstance(raw_include_public, bool):
                    include_public_repos = raw_include_public
        except Exception:
            pass

    return UnifiedConfig(
        skip_dirs=skip_dirs,
        project_github=project_github,
        github_username=github_username,
        include_public_repos=include_public_repos,
    )


def _is_under_any(path: Path, roots: Set[Path]) -> bool:
    for root in roots:
        try:
            path.relative_to(root)
            return True
        except ValueError:
            continue
    return False


def collect_readmes(repo_root: Path, cfg: UnifiedConfig) -> List[ReadmeDoc]:
    docs: List[ReadmeDoc] = []

    for root, dirs, files in os.walk(repo_root):
        root_path = Path(root).resolve()

        dirs[:] = [
            dirname
            for dirname in dirs
            if dirname not in DEFAULT_SKIP_DIRS
            and not _is_under_any((root_path / dirname).resolve(), cfg.skip_dirs)
        ]

        if _is_under_any(root_path, cfg.skip_dirs):
            continue

        for filename in files:
            if not filename.startswith("README") or not filename.endswith(".md"):
                continue

            readme_path = (root_path / filename).resolve()
            rel_dir = str(readme_path.parent.relative_to(repo_root))
            if rel_dir == ".":
                rel_dir = ""
            docs.append(ReadmeDoc(path=readme_path, rel_dir=rel_dir))

    docs.sort(key=lambda item: (item.rel_dir, item.path.name))
    return docs
