from __future__ import annotations

import json
from pathlib import Path
from typing import List
from .collector import ReadmeDoc
from .github_repos import PublicRepo

MANIFEST_NAME = ".unified_docs_manifest.json"


def _target_path_for_doc(docs_root: Path, doc: ReadmeDoc) -> Path:
    if not doc.rel_dir:
        return docs_root / "root" / "index.md"
    return docs_root / doc.rel_dir / "index.md"


def _relative_doc_link(doc: ReadmeDoc) -> str:
    if not doc.rel_dir:
        return "root/index.md"
    return f"{doc.rel_dir}/index.md"


def _top_category(rel_dir: str) -> str:
    if not rel_dir:
        return "Root"
    return rel_dir.split("/", 1)[0]


def _cleanup_previous_generated_docs(docs_root: Path) -> None:
    manifest = docs_root / MANIFEST_NAME
    if not manifest.exists():
        return

    try:
        raw = json.loads(manifest.read_text(encoding="utf-8"))
    except Exception:
        return

    if not isinstance(raw, list):
        return

    for rel_path in raw:
        if not isinstance(rel_path, str):
            continue
        target = docs_root / rel_path
        if target.exists() and target.is_file():
            target.unlink()

    for legacy in docs_root.glob("*.md"):
        if legacy.name != "index.md":
            legacy.unlink()


def _write_manifest(docs_root: Path, generated_files: list[str]) -> None:
    manifest = docs_root / MANIFEST_NAME
    manifest.write_text(json.dumps(sorted(set(generated_files)), indent=2), encoding="utf-8")


def build_combined_markdown(readmes: List[ReadmeDoc], out_file: Path) -> None:
    parts: list[str] = []

    parts.append("# Portfolio - All Projects\n\n")
    parts.append("This page aggregates all project READMEs.\n\n---\n\n")

    for doc in readmes:
        title = doc.rel_dir or "Root"
        parts.append(f"## {title}\n\n")
        parts.append(f"> Source: `{doc.path}`\n\n")
        parts.append(doc.path.read_text(encoding="utf-8"))
        parts.append("\n\n---\n\n")

    out_file.write_text("".join(parts), encoding="utf-8")


def build_docs_tree(readmes: List[ReadmeDoc], docs_root: Path, repos: list[PublicRepo] | None = None) -> None:
    docs_root.mkdir(parents=True, exist_ok=True)
    _cleanup_previous_generated_docs(docs_root)

    generated_files: list[str] = []

    categorized: dict[str, list[ReadmeDoc]] = {}
    for doc in readmes:
        category = _top_category(doc.rel_dir)
        categorized.setdefault(category, []).append(doc)

    index = docs_root / "index.md"
    lines = [
        "# My Engineering Portfolio",
        "",
        "Auto-generated from README files.",
        "",
        "## Projects",
        "",
    ]

    for category in sorted(categorized.keys()):
        lines.append(f"### {category}")
        lines.append("")
        for doc in sorted(categorized[category], key=lambda item: item.rel_dir):
            title = doc.rel_dir or "Root"
            link = _relative_doc_link(doc)
            lines.append(f"- [{title}]({link})")
        lines.append("")

    if repos:
        lines.extend(["## Public GitHub Repositories", ""])
        for repo in repos:
            description = f" - {repo.description}" if repo.description else ""
            lines.append(f"- [{repo.name}]({repo.html_url}){description}")
        lines.append("")

    index.write_text("\n".join(lines), encoding="utf-8")
    generated_files.append("index.md")

    for doc in readmes:
        target_file = _target_path_for_doc(docs_root, doc)
        target_file.parent.mkdir(parents=True, exist_ok=True)
        target_file.write_text(doc.path.read_text(encoding="utf-8"), encoding="utf-8")
        generated_files.append(str(target_file.relative_to(docs_root)))

    _write_manifest(docs_root, generated_files)
