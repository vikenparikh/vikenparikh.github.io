from __future__ import annotations

from pathlib import Path
import shutil
import subprocess
import sys


def ensure_mkdocs_config(repo_root: Path) -> Path:
    mkdocs_yml = repo_root / "mkdocs.yml"
    if not mkdocs_yml.exists():
        mkdocs_yml.write_text(
            "site_name: My Engineering Portfolio\n"
            "docs_dir: docs\n"
            "site_dir: site\n"
            "theme:\n"
            "  name: material\n"
            "nav:\n"
            "  - Home: index.md\n",
            encoding="utf-8",
        )
    return mkdocs_yml


def build_site(repo_root: Path) -> None:
    mkdocs_yml = ensure_mkdocs_config(repo_root)
    site_dir = repo_root / "site"
    if site_dir.exists():
        shutil.rmtree(site_dir)

    subprocess.run(
        [sys.executable, "-m", "mkdocs", "build", "-f", str(mkdocs_yml)],
        cwd=repo_root,
        check=True,
    )
