from __future__ import annotations

import json
import re
from pathlib import Path
from typing import List
from .collector import ReadmeDoc, UnifiedConfig
from .github_repos import PublicRepo

MANIFEST_NAME = ".unified_docs_manifest.json"
PORTFOLIO_CSS = """.portfolio-hero {
    display: grid;
    gap: 1.25rem;
    grid-template-columns: 110px 1fr;
    align-items: center;
    margin-bottom: 1.4rem;
}

.portfolio-avatar {
    width: 110px;
    height: 110px;
    object-fit: cover;
    border-radius: 999px;
    border: 3px solid var(--md-primary-fg-color);
    box-shadow: 0 0 0 6px var(--md-primary-fg-color--transparent);
}

.portfolio-hero-content h1 {
    margin-bottom: 0.25rem;
}

.portfolio-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin: 0.8rem 0 1.2rem;
}

.portfolio-pill {
    display: inline-block;
    padding: 0.42rem 0.95rem;
    border-radius: 999px;
    border: 1px solid var(--md-primary-fg-color);
    font-weight: 600;
    text-decoration: none;
    transition: all 0.2s ease;
}

.portfolio-pill:hover {
    background: var(--md-primary-fg-color--transparent);
}

.portfolio-grid {
    display: grid;
    gap: 0.9rem;
}

.portfolio-grid-2 {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.portfolio-grid-3 {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.portfolio-card {
    border: 1px solid var(--md-default-fg-color--lightest);
    border-radius: 0.8rem;
    padding: 1.05rem;
    background: var(--md-default-bg-color);
    height: 100%;
}

.portfolio-card h3,
.portfolio-card h4 {
    margin-top: 0;
}

.portfolio-card ul {
    margin: 0.35rem 0 0.2rem;
}

.portfolio-card-kicker {
    display: inline-block;
    font-size: 0.72rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--md-default-fg-color--light);
    margin-bottom: 0.35rem;
}

.portfolio-card-stat {
    text-align: center;
}

.portfolio-card-featured {
    border-color: var(--md-primary-fg-color--light);
    box-shadow: 0 8px 22px var(--md-primary-fg-color--transparent);
}

.portfolio-stat-value {
    font-size: 1.65rem;
    line-height: 1;
    font-weight: 700;
    margin-bottom: 0.3rem;
}

.portfolio-stat-label {
    font-size: 0.85rem;
    color: var(--md-default-fg-color--light);
}

.portfolio-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin-bottom: 1rem;
}

.portfolio-tag {
    padding: 0.2rem 0.65rem;
    border-radius: 999px;
    background: var(--md-primary-fg-color--transparent);
    border: 1px solid var(--md-primary-fg-color--light);
    font-size: 0.82rem;
}

.portfolio-grid + .portfolio-grid {
    margin-top: 0.4rem;
}

.portfolio-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.45rem;
}

.portfolio-meta-pill {
    padding: 0.15rem 0.55rem;
    border-radius: 999px;
    border: 1px solid var(--md-default-fg-color--lighter);
    font-size: 0.75rem;
    color: var(--md-default-fg-color--light);
}

@media (max-width: 700px) {
    .portfolio-hero {
        grid-template-columns: 1fr;
        text-align: center;
    }

    .portfolio-avatar {
        margin: 0 auto;
    }
}
"""


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


def _skill_groups(skills: list[str]) -> dict[str, list[str]]:
    groups: dict[str, list[str]] = {
        "Languages & Runtime": [],
        "AI & ML": [],
        "Data & Platforms": [],
        "Cloud & DevOps": [],
        "Engineering": [],
    }

    for skill in skills:
        lowered = skill.lower()
        if any(token in lowered for token in ["python", "java", "javascript", "typescript", "go", "c++", "runtime"]):
            groups["Languages & Runtime"].append(skill)
        elif any(token in lowered for token in ["machine learning", "ml", "deep learning", "ai", "llm", "nlp"]):
            groups["AI & ML"].append(skill)
        elif any(token in lowered for token in ["data", "etl", "spark", "pipeline", "database", "backend"]):
            groups["Data & Platforms"].append(skill)
        elif any(token in lowered for token in ["cloud", "aws", "azure", "gcp", "kubernetes", "docker", "devops"]):
            groups["Cloud & DevOps"].append(skill)
        else:
            groups["Engineering"].append(skill)

    return {label: values for label, values in groups.items() if values}


def _project_record(doc: ReadmeDoc, cfg: UnifiedConfig) -> dict[str, str | ReadmeDoc]:
    readme_content = doc.path.read_text(encoding="utf-8")
    return {
        "doc": doc,
        "title": _display_name(doc),
        "link": _relative_doc_link(doc),
        "summary": cfg.project_summaries.get(doc.rel_dir) or _summarize_readme(readme_content),
        "preview": _preview_readme(readme_content),
        "github_url": cfg.project_github.get(doc.rel_dir) or "",
        "project_image": cfg.project_images.get(doc.rel_dir) or "",
        "category": _top_category(doc.rel_dir),
    }


def _featured_projects(readmes: list[ReadmeDoc], cfg: UnifiedConfig, limit: int = 6) -> list[dict[str, str | ReadmeDoc]]:
    records = [_project_record(doc, cfg) for doc in readmes]

    def _score(record: dict[str, str | ReadmeDoc]) -> int:
        score = 0
        if record.get("github_url"):
            score += 3
        if record.get("project_image"):
            score += 2
        summary = str(record.get("summary") or "")
        score += min(len(summary) // 60, 3)
        return score

    records.sort(key=lambda item: (-_score(item), str(item.get("title", ""))))
    return records[:limit]


def _featured_repositories(repos: list[PublicRepo], cfg: UnifiedConfig, limit: int = 9) -> list[PublicRepo]:
    priority_keywords = [
        "ai",
        "ml",
        "machine learning",
        "llm",
        "nlp",
        "backend",
        "data",
        "cloud",
        "deep learning",
    ]

    filtered = [
        repo
        for repo in repos
        if repo.name.lower() != "vikenparikh.github.io" and not repo.is_archived and not repo.is_fork
    ]

    repo_by_name = {repo.name.lower(): repo for repo in filtered}
    curated: list[PublicRepo] = []
    for name in cfg.featured_repos:
        matched = repo_by_name.get(name.lower())
        if matched:
            curated.append(matched)

    def _score(repo: PublicRepo) -> int:
        haystack = f"{repo.name} {repo.description}".lower()
        keyword_score = sum(1 for keyword in priority_keywords if keyword in haystack)
        language_score = 1 if (repo.language or "").lower() in {"python", "typescript", "java", "c#", "go"} else 0
        return repo.stars * 10 + keyword_score * 3 + language_score

    filtered.sort(key=lambda repo: (-_score(repo), -repo.stars, repo.name.lower()))
    merged = curated + [repo for repo in filtered if repo.name.lower() not in {item.name.lower() for item in curated}]
    return merged[:limit]


def _portfolio_home_link(doc: ReadmeDoc) -> str:
    depth = max(1, len([part for part in doc.rel_dir.split("/") if part]))
    return "../" * depth + "index.md"


def _portfolio_stats(readmes: list[ReadmeDoc], categories: dict[str, list[ReadmeDoc]]) -> list[tuple[str, str]]:
    project_count = len(readmes)
    category_count = len(categories)
    root_projects = len([doc for doc in readmes if not doc.rel_dir])
    return [
        ("Projects", str(project_count)),
        ("Categories", str(category_count)),
        ("Root Projects", str(root_projects)),
    ]


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

    css_file = docs_root / "assets" / "stylesheets" / "portfolio.css"
    css_file.parent.mkdir(parents=True, exist_ok=True)
    css_file.write_text(PORTFOLIO_CSS, encoding="utf-8")

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
    stats = _portfolio_stats(readmes, categorized)

    skill_groups = _skill_groups(cfg.skills)
    featured = _featured_projects(readmes, cfg)
    featured_repos = _featured_repositories(repos or [], cfg) if repos else []
    featured_paths = {
        str((item["doc"]).path)  # type: ignore[index]
        for item in featured
        if isinstance(item.get("doc"), ReadmeDoc)
    }

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
        "## Snapshot",
        "",
        "<div class=\"portfolio-grid portfolio-grid-3\">",
    ])
    for label, value in stats:
        lines.extend([
            "<div class=\"portfolio-card portfolio-card-stat\">",
            f"<div class=\"portfolio-stat-value\">{value}</div>",
            f"<div class=\"portfolio-stat-label\">{label}</div>",
            "</div>",
        ])
    lines.extend([
        "</div>",
        "",
        "## Recruiter Overview",
        "",
        "<div class=\"portfolio-grid portfolio-grid-3\">",
        "<div class=\"portfolio-card\">",
        "### What I Build",
        "- Backend platforms and APIs",
        "- ML-powered product features",
        "- Applied AI solutions for real workflows",
        "</div>",
        "<div class=\"portfolio-card\">",
        "### How I Deliver",
        "- Production-first engineering",
        "- Measurable business outcomes",
        "- Maintainable, testable implementations",
        "</div>",
        "<div class=\"portfolio-card\">",
        "### What You Can Expect",
        "- Strong ownership mindset",
        "- Clear communication with stakeholders",
        "- Fast iteration with engineering rigor",
        "</div>",
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
    lines.extend(["</div>", "", "## Core Competencies", ""])

    if skill_groups:
        lines.append("<div class=\"portfolio-grid portfolio-grid-2\">")
        for group, values in skill_groups.items():
            lines.extend([
                "<div class=\"portfolio-card\">",
                f"### {group}",
                "",
                "<div class=\"portfolio-tags\">",
            ])
            lines.extend([f"<span class=\"portfolio-tag\">{skill}</span>" for skill in values])
            lines.extend(["</div>", "", "</div>"])
        lines.extend(["</div>", ""])
    elif cfg.skills:
        lines.append("<div class=\"portfolio-tags\">")
        lines.extend([f"<span class=\"portfolio-tag\">{skill}</span>" for skill in cfg.skills])
        lines.append("</div>")
        lines.append("")

    if featured_repos:
        lines.extend([
            "## Featured GitHub Projects",
            "",
            "<div class=\"portfolio-grid portfolio-grid-3\">",
            "",
        ])

        for repo in featured_repos:
            description = repo.description or "Production-focused repository with practical engineering outcomes."
            lines.extend([
                "<div class=\"portfolio-card portfolio-card-featured\">",
                "<span class=\"portfolio-card-kicker\">GitHub</span>",
                "",
                f"#### [{repo.name}]({repo.html_url})",
                "",
                description,
                "",
                "<div class=\"portfolio-meta\">",
                f"<span class=\"portfolio-meta-pill\">★ {repo.stars}</span>",
                f"<span class=\"portfolio-meta-pill\">⑂ {repo.forks}</span>",
                f"<span class=\"portfolio-meta-pill\">{repo.language or 'Code'}</span>",
                "</div>",
                "",
                "</div>",
                "",
            ])

        lines.extend(["</div>", ""])

    featured_docs = [
        item
        for item in featured
        if str(item.get("category", "")).lower() not in {"root", "legacy_site"}
    ]

    if featured_docs:
        lines.extend([
            "## Featured Portfolio Docs",
            "",
            "<div class=\"portfolio-grid portfolio-grid-3\">",
            "",
        ])

        for item in featured_docs:
            title = str(item["title"])
            link = str(item["link"])
            summary = str(item["summary"])
            github_url = str(item["github_url"])
            project_image = str(item["project_image"])
            category = str(item["category"])

            lines.extend([
                "<div class=\"portfolio-card portfolio-card-featured\">",
                f"<span class=\"portfolio-card-kicker\">{category}</span>",
                "",
                f"#### [{title}]({link})",
                "",
            ])
            if project_image:
                lines.extend([f"![{title}]({project_image})", ""])
            lines.extend([summary, ""])
            if github_url:
                lines.append(f"- GitHub: [{github_url}]({github_url})")
            lines.append(f"- Project docs: [{link}]({link})")
            lines.extend(["", "</div>", ""])

        lines.extend(["</div>", ""])

    directory_sections: list[str] = []

    for category in sorted(categorized.keys()):
        category_lines = [f"### {category}", "", "<div class=\"portfolio-grid portfolio-grid-2\">", ""]
        card_count = 0
        for doc in sorted(categorized[category], key=lambda item: item.rel_dir):
            readme_content = doc.path.read_text(encoding="utf-8")
            title = _display_name(doc)
            link = _relative_doc_link(doc)
            summary = cfg.project_summaries.get(doc.rel_dir) or _summarize_readme(readme_content)
            github_url = cfg.project_github.get(doc.rel_dir)
            project_image = cfg.project_images.get(doc.rel_dir)

            if str(doc.path) in featured_paths:
                continue

            category_lines.append("<div class=\"portfolio-card\">")
            category_lines.append("")
            category_lines.append(f"<span class=\"portfolio-card-kicker\">{category}</span>")
            category_lines.append("")
            category_lines.append(f"#### [{title}]({link})")
            category_lines.append("")
            if project_image:
                category_lines.append(f"![{title}]({project_image})")
                category_lines.append("")
            category_lines.append(summary)
            category_lines.append("")
            if github_url:
                category_lines.append(f"- GitHub: [{github_url}]({github_url})")
            category_lines.append(f"- Project docs: [{link}]({link})")
            category_lines.append("")

            preview = _preview_readme(readme_content)
            if preview:
                category_lines.extend([
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
            category_lines.append("</div>")
            category_lines.append("")
            card_count += 1

        if card_count > 0:
            category_lines.extend(["</div>", ""])
            directory_sections.extend(category_lines)

    if directory_sections:
        lines.extend(["## Project Directory", ""])
        lines.extend(directory_sections)

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
            metrics = f" (★ {repo.stars}, ⑂ {repo.forks}{', ' + repo.language if repo.language else ''})"
            lines.append(f"- [{repo.name}]({repo.html_url}){description}{metrics}")
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
        page_parts.extend([f"[← Back to portfolio]({_portfolio_home_link(doc)})", ""])
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
