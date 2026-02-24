from __future__ import annotations

import argparse
from pathlib import Path

from .collector import collect_readmes, load_config
from .combiner import build_combined_markdown, build_docs_tree
from .github_repos import list_public_repos
from .portfolio_enhancer import enhance_docs_with_github
from .site_generator import build_site


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

    build_docs_tree(readmes, docs_root, repos=public_repos)
    enhance_docs_with_github(readmes, cfg, docs_root)

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
