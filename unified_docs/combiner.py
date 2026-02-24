from __future__ import annotations

import json
import re
from pathlib import Path
from typing import List
from .collector import ReadmeDoc, UnifiedConfig
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


def _display_name(doc: ReadmeDoc) -> str:
    if not doc.rel_dir:
        return "Root"
    return doc.rel_dir.split("/")[-1].replace("-", " ").replace("_", " ").title()


def _summarize_readme(content: str) -> str:
    stripped = re.sub(r"```[\s\S]*?```", "", content)
    lines = [line.strip() for line in stripped.splitlines() if line.strip()]
    cleaned: list[str] = []
    for line in lines:
        if line.startswith("#"):
            continue
        if line.startswith("!["):
            continue
        if line.startswith("```"):
            continue
        line = re.sub(r"`([^`]+)`", r"\1", line)
        line = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", line)
        line = re.sub(r"^[>*\-\d.\s]+", "", line)
        if line:
            cleaned.append(line)
        if len(cleaned) >= 3:
            break
    summary = " ".join(cleaned)
    return summary[:280] if summary else "No summary available."


def _preview_readme(content: str, max_lines: int = 24) -> str:
    lines = content.splitlines()
    return "\n".join(lines[:max_lines]).strip()


def _focus_areas(skills: list[str]) -> list[str]:
    lowered = [skill.lower() for skill in skills]
    areas: list[str] = []

    if any(token in " ".join(lowered) for token in ["backend", "api", "data", "cloud"]):
        areas.append("Backend Systems")
    if any(token in " ".join(lowered) for token in ["machine learning", "ml", "deep learning"]):
        areas.append("Machine Learning")
    if any(token in " ".join(lowered) for token in ["ai", "llm", "nlp"]):
        areas.append("Applied AI")

    if not areas:
        areas = ["Backend Systems", "Machine Learning", "Applied AI"]

    return areas


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


def build_docs_tree(
    readmes: List[ReadmeDoc],
    docs_root: Path,
    cfg: UnifiedConfig,
    repos: list[PublicRepo] | None = None,
) -> None:
    docs_root.mkdir(parents=True, exist_ok=True)
    _cleanup_previous_generated_docs(docs_root)

    generated_files: list[str] = []

    categorized: dict[str, list[ReadmeDoc]] = {}
    for doc in readmes:
        category = _top_category(doc.rel_dir)
        categorized.setdefault(category, []).append(doc)

    index = docs_root / "index.md"
    github_profile = (
        f"https://github.com/{cfg.github_username}" if cfg.github_username else None
    )
    focus_areas = _focus_areas(cfg.skills)

    lines = [
        "<div class=\"portfolio-hero\">",
        f"<img class=\"portfolio-avatar\" src=\"{cfg.profile_photo}\" alt=\"{cfg.profile_name}\" />",
        "<div class=\"portfolio-hero-content\">",
        f"# {cfg.profile_name}",
        "",
        f"**{cfg.profile_title}**",
        "",
        cfg.profile_tagline,
        "",
        "</div>",
        "</div>",
        "",
        "<div class=\"portfolio-links\">",
        f"<a class=\"portfolio-pill\" href=\"{cfg.resume_path}\">View Resume</a>",
    ]
    if github_profile:
        lines.append(f"<a class=\"portfolio-pill\" href=\"{github_profile}\">GitHub Profile</a>")
    lines.extend([
        "</div>",
        "",
        "## Focus Areas",
        "",
        "<div class=\"portfolio-grid portfolio-grid-3\">",
    ])
    for area in focus_areas:
        lines.extend([
            "<div class=\"portfolio-card\">",
            f"### {area}",
            "",
            "Building practical, production-ready outcomes with strong engineering rigor.",
            "",
            "</div>",
        ])
    lines.extend([
        "</div>",
        "",
        "## Tech Stack",
        "",
    ])

    if cfg.skills:
        lines.append("<div class=\"portfolio-tags\">")
        lines.extend([f"<span class=\"portfolio-tag\">{skill}</span>" for skill in cfg.skills])
        lines.append("</div>")
        lines.append("")

    lines.extend(["## Projects", ""])

    for category in sorted(categorized.keys()):
        lines.append(f"### {category}")
        lines.extend(["", "<div class=\"portfolio-grid portfolio-grid-2\">", ""])
        for doc in sorted(categorized[category], key=lambda item: item.rel_dir):
            readme_content = doc.path.read_text(encoding="utf-8")
            title = _display_name(doc)
            link = _relative_doc_link(doc)
            summary = cfg.project_summaries.get(doc.rel_dir) or _summarize_readme(readme_content)
            github_url = cfg.project_github.get(doc.rel_dir)
            project_image = cfg.project_images.get(doc.rel_dir)

            lines.append("<div class=\"portfolio-card\">")
            lines.append("")
            lines.append(f"#### [{title}]({link})")
            lines.append("")
            if project_image:
                lines.append(f"![{title}]({project_image})")
                lines.append("")
            lines.append(summary)
            lines.append("")
            if github_url:
                lines.append(f"- GitHub: [{github_url}]({github_url})")
            lines.append(f"- Full docs: [{link}]({link})")
            lines.append("")

            preview = _preview_readme(readme_content)
            if preview:
                lines.extend([
                    "<details>",
                    "<summary>Expand README preview</summary>",
                    "",
                    "```markdown",
                    preview,
                    "```",
                    "",
                    "</details>",
                    "",
                ])
            lines.append("</div>")
            lines.append("")
        lines.extend(["</div>", ""])

    if repos:
        filtered_repos = [repo for repo in repos if repo.name.lower() != "vikenparikh.github.io"]
        displayed_repos = filtered_repos[:24]

        lines.extend([
            "## Public GitHub Repositories",
            "",
            f"Showing {len(displayed_repos)} of {len(filtered_repos)} repositories.",
            "",
        ])
        for repo in displayed_repos:
            description = f" - {repo.description}" if repo.description else ""
            lines.append(f"- [{repo.name}]({repo.html_url}){description}")
        lines.append("")

    index.write_text("\n".join(lines), encoding="utf-8")
    generated_files.append("index.md")

    for doc in readmes:
        target_file = _target_path_for_doc(docs_root, doc)
        target_file.parent.mkdir(parents=True, exist_ok=True)
        readme_content = doc.path.read_text(encoding="utf-8")
        project_title = _display_name(doc)
        project_summary = cfg.project_summaries.get(doc.rel_dir) or _summarize_readme(readme_content)
        project_image = cfg.project_images.get(doc.rel_dir)
        github_url = cfg.project_github.get(doc.rel_dir)

        page_parts: list[str] = [f"# {project_title}", "", project_summary, ""]
        if project_image:
            page_parts.extend([f"![{project_title}]({project_image})", ""])
        if github_url:
            page_parts.extend([f"[View on GitHub]({github_url})", ""])

        page_parts.extend([
            "## README",
            "",
            "<details open>",
            "<summary>Expand/collapse full README</summary>",
            "",
            readme_content,
            "",
            "</details>",
            "",
        ])

        target_file.write_text("\n".join(page_parts), encoding="utf-8")
        generated_files.append(str(target_file.relative_to(docs_root)))

    _write_manifest(docs_root, generated_files)
