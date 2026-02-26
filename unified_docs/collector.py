from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Set
import json
import os

CONFIG_FILE = "unified_docs.json"
DEFAULT_SKIP_DIRS = {".venv", ".git", "site", "docs", "__pycache__", ".template_refs", "legacy_site"}


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
    scan_paths: list[str]
    auto_sync_resume: bool
    resume_source_dir: str
    profile_name: str
    profile_title: str
    profile_tagline: str
    profile_photo: str
    resume_path: str
    skills: list[str]
    project_summaries: Dict[str, str]
    project_images: Dict[str, str]
    featured_repos: list[str]
    contact_email: str
    linkedin_url: str
    location: str


def _normalize_rel_dir(value: str) -> str:
    return value.replace("\\", "/").strip("/")


def load_config(repo_root: Path) -> UnifiedConfig:
    cfg_path = repo_root / CONFIG_FILE
    skip_dirs: Set[Path] = set()
    project_github: Dict[str, str] = {}
    github_username: str | None = None
    include_public_repos = False
    scan_paths: list[str] = ["."]
    auto_sync_resume = True
    resume_source_dir = "resume"
    profile_name = "My Engineering Portfolio"
    profile_title = "Software Engineer"
    profile_tagline = "Building reliable systems and AI-powered products."
    profile_photo = "assets/images/myphoto.jpg"
    resume_path = "assets/images/Resume/Resume.pdf"
    skills: list[str] = []
    project_summaries: Dict[str, str] = {}
    project_images: Dict[str, str] = {}
    featured_repos: list[str] = []
    contact_email = ""
    linkedin_url = ""
    location = ""

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
                        _normalize_rel_dir(str(key)): str(value)
                        for key, value in github_map.items()
                        if isinstance(key, str) and isinstance(value, str)
                    }

                raw_username = raw.get("github_username")
                if isinstance(raw_username, str) and raw_username.strip():
                    github_username = raw_username.strip()

                raw_include_public = raw.get("include_public_repos")
                if isinstance(raw_include_public, bool):
                    include_public_repos = raw_include_public

                raw_scan_paths = raw.get("scan_paths")
                if isinstance(raw_scan_paths, list):
                    parsed_scan_paths = [
                        value.strip()
                        for value in raw_scan_paths
                        if isinstance(value, str) and value.strip()
                    ]
                    if parsed_scan_paths:
                        scan_paths = parsed_scan_paths

                raw_auto_sync_resume = raw.get("auto_sync_resume")
                if isinstance(raw_auto_sync_resume, bool):
                    auto_sync_resume = raw_auto_sync_resume

                raw_resume_source_dir = raw.get("resume_source_dir")
                if isinstance(raw_resume_source_dir, str) and raw_resume_source_dir.strip():
                    resume_source_dir = raw_resume_source_dir.strip()

                profile = raw.get("profile")
                if isinstance(profile, dict):
                    raw_name = profile.get("name")
                    raw_title = profile.get("title")
                    raw_tagline = profile.get("tagline")
                    raw_photo = profile.get("photo")
                    raw_resume = profile.get("resume")

                    if isinstance(raw_name, str) and raw_name.strip():
                        profile_name = raw_name.strip()
                    if isinstance(raw_title, str) and raw_title.strip():
                        profile_title = raw_title.strip()
                    if isinstance(raw_tagline, str) and raw_tagline.strip():
                        profile_tagline = raw_tagline.strip()
                    if isinstance(raw_photo, str) and raw_photo.strip():
                        profile_photo = raw_photo.strip()
                    if isinstance(raw_resume, str) and raw_resume.strip():
                        resume_path = raw_resume.strip()

                raw_skills = raw.get("skills")
                if isinstance(raw_skills, list):
                    parsed_skills = [
                        skill.strip()
                        for skill in raw_skills
                        if isinstance(skill, str) and skill.strip()
                    ]
                    if parsed_skills:
                        skills = parsed_skills

                raw_project_summaries = raw.get("project_summaries")
                if isinstance(raw_project_summaries, dict):
                    project_summaries = {
                        _normalize_rel_dir(str(key)): str(value)
                        for key, value in raw_project_summaries.items()
                        if isinstance(key, str) and isinstance(value, str) and value.strip()
                    }

                raw_project_images = raw.get("project_images")
                if isinstance(raw_project_images, dict):
                    project_images = {
                        _normalize_rel_dir(str(key)): str(value)
                        for key, value in raw_project_images.items()
                        if isinstance(key, str) and isinstance(value, str) and value.strip()
                    }

                raw_featured_repos = raw.get("featured_repos")
                if isinstance(raw_featured_repos, list):
                    featured_repos = [
                        item.strip()
                        for item in raw_featured_repos
                        if isinstance(item, str) and item.strip()
                    ]

                raw_contact = raw.get("contact")
                if isinstance(raw_contact, dict):
                    raw_contact_email = raw_contact.get("email")
                    raw_linkedin = raw_contact.get("linkedin")
                    raw_location = raw_contact.get("location")
                    if isinstance(raw_contact_email, str) and raw_contact_email.strip():
                        contact_email = raw_contact_email.strip()
                    if isinstance(raw_linkedin, str) and raw_linkedin.strip():
                        linkedin_url = raw_linkedin.strip()
                    if isinstance(raw_location, str) and raw_location.strip():
                        location = raw_location.strip()
        except Exception:
            pass

    return UnifiedConfig(
        skip_dirs=skip_dirs,
        project_github=project_github,
        github_username=github_username,
        include_public_repos=include_public_repos,
        scan_paths=scan_paths,
        auto_sync_resume=auto_sync_resume,
        resume_source_dir=resume_source_dir,
        profile_name=profile_name,
        profile_title=profile_title,
        profile_tagline=profile_tagline,
        profile_photo=profile_photo,
        resume_path=resume_path,
        skills=skills,
        project_summaries=project_summaries,
        project_images=project_images,
        featured_repos=featured_repos,
        contact_email=contact_email,
        linkedin_url=linkedin_url,
        location=location,
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
    seen_paths: set[Path] = set()

    scan_roots: list[Path] = []
    for rel in cfg.scan_paths:
        candidate = (repo_root / rel).resolve()
        if candidate.is_dir() and candidate not in scan_roots:
            scan_roots.append(candidate)

    if repo_root not in scan_roots:
        scan_roots.insert(0, repo_root)

    def _is_under(path: Path, base: Path) -> bool:
        try:
            path.relative_to(base)
            return True
        except ValueError:
            return False

    for scan_root in scan_roots:
        for root, dirs, files in os.walk(scan_root):
            root_path = Path(root).resolve()

            if scan_root != repo_root and _is_under(root_path, repo_root):
                dirs[:] = []
                continue

            dirs[:] = [
                dirname
                for dirname in dirs
                if dirname not in DEFAULT_SKIP_DIRS
                and not dirname.startswith(".")
                and not _is_under_any((root_path / dirname).resolve(), cfg.skip_dirs)
                and not (
                    scan_root != repo_root
                    and _is_under((root_path / dirname).resolve(), repo_root)
                )
            ]

            if _is_under_any(root_path, cfg.skip_dirs):
                continue

            for filename in files:
                if not filename.upper().startswith("README") or not filename.lower().endswith(".md"):
                    continue

                readme_path = (root_path / filename).resolve()
                if readme_path in seen_paths:
                    continue
                seen_paths.add(readme_path)

                if scan_root == repo_root:
                    rel_dir = str(readme_path.parent.relative_to(repo_root))
                    if rel_dir == ".":
                        rel_dir = ""
                else:
                    rel_dir = str(readme_path.parent.relative_to(scan_root))
                    if rel_dir == ".":
                        rel_dir = ""

                rel_dir = _normalize_rel_dir(rel_dir)

                docs.append(ReadmeDoc(path=readme_path, rel_dir=rel_dir))

    docs.sort(key=lambda item: (item.rel_dir, item.path.name))
    return docs
