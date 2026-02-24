from __future__ import annotations

from pathlib import Path
from .collector import ReadmeDoc, UnifiedConfig


def _target_doc_file(docs_root: Path, rel_dir: str) -> Path:
    if not rel_dir:
        return docs_root / "root" / "index.md"
    return docs_root / rel_dir / "index.md"


def prepend_github_link(content: str, project_url: str, project_name: str) -> str:
    banner = (
        "!!! info \"GitHub\"\n"
        f"    [View on GitHub]({project_url}) - {project_name}\n\n"
    )
    return banner + content


def enhance_docs_with_github(readmes: list[ReadmeDoc], cfg: UnifiedConfig, docs_root: Path) -> None:
    for doc in readmes:
        project_url = cfg.project_github.get(doc.rel_dir)
        if not project_url:
            continue

        target_file = _target_doc_file(docs_root, doc.rel_dir)
        if not target_file.exists():
            continue

        original = target_file.read_text(encoding="utf-8")
        project_name = doc.rel_dir or "Root Project"
        updated = prepend_github_link(original, project_url, project_name)
        target_file.write_text(updated, encoding="utf-8")
