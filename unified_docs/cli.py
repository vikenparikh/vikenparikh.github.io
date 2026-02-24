from __future__ import annotations

import argparse
from pathlib import Path
import shutil

from .collector import collect_readmes, load_config
from .combiner import build_combined_markdown, build_docs_tree
from .github_repos import list_public_repos
from .site_generator import build_site


def _sync_resume(repo_root: Path, resume_target_rel: str, source_dir_rel: str) -> None:
    source_dir = (repo_root / source_dir_rel).resolve()
    if not source_dir.exists() or not source_dir.is_dir():
        return

    candidates = sorted(
        [path for path in source_dir.glob("*.pdf") if path.is_file()],
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    if not candidates:
        return

    latest_resume = candidates[0]
    target_resume = (repo_root / resume_target_rel).resolve()
    target_resume.parent.mkdir(parents=True, exist_ok=True)

    if latest_resume == target_resume:
        return

    shutil.copy2(latest_resume, target_resume)


def _publish_root_index(repo_root: Path, docs_root: Path) -> None:
    docs_index = docs_root / "index.md"
    if not docs_index.exists():
        return

    root_index = repo_root / "index.md"
    root_index.write_text(docs_index.read_text(encoding="utf-8"), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="unified-docs",
        description="Combine READMEs into a portfolio and build a hostable site.",
    )
    parser.add_argument(
        "command",
        choices=["build", "docs-only"],
        help="build: markdown + docs tree + site; docs-only: no site build",
    )
    parser.add_argument(
        "--root",
        type=str,
        default=".",
        help="Root directory to scan (default: current directory).",
    )
    parser.add_argument(
        "--combined-file",
        type=str,
        default="ALL_DOCS.md",
        help="Combined markdown output file at repo root.",
    )

    args = parser.parse_args()
    repo_root = Path(args.root).resolve()

    cfg = load_config(repo_root)
    if cfg.auto_sync_resume:
        _sync_resume(repo_root, cfg.resume_path, cfg.resume_source_dir)

    readmes = collect_readmes(repo_root, cfg)

    if not readmes:
        print("No README files found.")
        return

    combined_path = repo_root / args.combined_file
    build_combined_markdown(readmes, combined_path)

    docs_root = repo_root / "docs"
    public_repos = None

    if cfg.include_public_repos and cfg.github_username:
        public_repos = list_public_repos(cfg.github_username)

    build_docs_tree(readmes, docs_root, cfg=cfg, repos=public_repos)
    _publish_root_index(repo_root, docs_root)

    if args.command == "build":
        build_site(repo_root)
        print(f"Combined docs: {combined_path}")
        print(f"Docs tree: {docs_root}")
        print(f"Static site: {repo_root / 'site'}")
    else:
        print(f"Combined docs: {combined_path}")
        print(f"Docs tree: {docs_root}")


if __name__ == "__main__":
    main()
