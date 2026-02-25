from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen


README_CANDIDATES = ["README.md", "readme.md", "Readme.md"]


@dataclass
class BuilderConfig:
    scan_paths: list[str]
    skip_projects: set[str]
    exclude_projects: set[str]
    github_username: str
    project_github: dict[str, str]
    max_projects: int
    preferred_projects: list[str]
    github_fallback_limit: int


def normalize_name(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", value.strip().lower())
    normalized = re.sub(r"-+", "-", normalized).strip("-")
    return normalized


def load_config(root: Path, config_path: Path) -> BuilderConfig:
    if config_path.exists():
        raw = json.loads(config_path.read_text(encoding="utf-8"))
    else:
        raw = {}

    return BuilderConfig(
        scan_paths=raw.get("scan_paths", [".."]),
        skip_projects={normalize_name(str(name)) for name in raw.get("skip_projects", [])},
        exclude_projects={normalize_name(str(name)) for name in raw.get("exclude_projects", [])},
        github_username=raw.get("github_username", "").strip(),
        project_github=raw.get("project_github", {}),
        max_projects=int(raw.get("max_projects", 24)),
        preferred_projects=[normalize_name(str(name)) for name in raw.get("preferred_projects", [])],
        github_fallback_limit=int(raw.get("github_fallback_limit", 30)),
    )


def find_readme(project_dir: Path) -> Path | None:
    for name in README_CANDIDATES:
        candidate = project_dir / name
        if candidate.exists() and candidate.is_file():
            return candidate
    return None


def summarize_readme(content: str) -> str:
    text = re.sub(r"```[\s\S]*?```", "", content)
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    cleaned: list[str] = []

    def clean_line(line: str) -> str:
        line = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", line)
        line = re.sub(r"`([^`]+)`", r"\1", line)
        line = re.sub(r"https?://\S+", "", line)
        line = re.sub(r"^[>*\-\d.\s]+", "", line).strip()
        line = re.sub(r"\s+", " ", line)
        return line

    for line in lines:
        if line.startswith("#") or line.startswith("!["):
            continue
        line = clean_line(line)
        if len(line) < 30:
            continue
        if line:
            cleaned.append(line)
        if len(cleaned) >= 3:
            break

    if not cleaned:
        return "Project repository with implementation details and documentation."

    summary = " ".join(cleaned)
    sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+", summary) if part.strip()]
    if sentences:
        summary = sentences[0]

    if len(summary) <= 220:
        return summary

    trimmed = summary[:220].rstrip()
    cut = trimmed.rfind(" ")
    if cut > 100:
        trimmed = trimmed[:cut]
    return f"{trimmed}…"


def infer_skills(project_name: str, readme_text: str) -> list[str]:
    corpus = f"{project_name} {readme_text}".lower()
    rules = [
        ("Full Stack", ["full stack", "end-to-end", "frontend", "backend"]),
        ("Backend", ["backend", "api", "microservice", "fastapi", "flask", "django", "server"]),
        ("Frontend", ["frontend", "react", "next.js", "astro", "ui", "web app", "javascript", "typescript"]),
        ("DevOps", ["docker", "kubernetes", "ci/cd", "github actions", "terraform", "helm", "ansible"]),
        ("AI", ["ai", "artificial intelligence", "agent", "generative", "inference"]),
        ("LLMs", ["llm", "gpt", "transformer", "chatbot", "prompt"]),
        ("RAG", ["rag", "retrieval augmented", "vector database", "embedding", "semantic search"]),
        ("Python", ["python", "pytorch", "tensorflow", "numpy", "pandas"]),
        ("Machine Learning", ["machine learning", "ml", "classification", "regression"]),
        ("Deep Learning", ["deep learning", "neural", "transformer", "lstm"]),
        ("NLP", ["nlp", "language model", "llm", "bert", "gpt"]),
        ("Computer Vision", ["opencv", "vision", "image", "object detection"]),
        ("AWS", ["aws", "ec2", "s3", "lambda", "autoscaling"]),
        ("Java", ["java", "spring"]),
    ]
    skills: list[str] = []
    for skill, keywords in rules:
        if any(keyword in corpus for keyword in keywords):
            skills.append(skill)

    if not skills:
        skills = ["Backend", "AI"]

    return skills[:6]


def resolve_repo_link(project_name: str, cfg: BuilderConfig) -> str:
    direct = cfg.project_github.get(project_name)
    if direct:
        return direct

    lowered = normalize_name(project_name)
    for key, value in cfg.project_github.items():
        if normalize_name(str(key)) == lowered:
            return str(value)

    if cfg.github_username:
        return f"https://github.com/{cfg.github_username}/{project_name}"
    return ""


def canonical_github_link(link: str) -> str:
    if not link:
        return ""

    parsed = urlparse(link.strip())
    host = parsed.netloc.lower().replace("www.", "")
    path = parsed.path.rstrip("/").lower()
    return f"{host}{path}"


def canonical_name_key(name: str) -> str:
    normalized = normalize_name(name)
    normalized = re.sub(r"(?:-|_)?backup(?:-|_)?\d.*$", "", normalized)
    normalized = re.sub(r"(?:-|_)?\d{8,}$", "", normalized)
    normalized = re.sub(r"(?:-|_)?(copy|old)$", "", normalized)
    normalized = re.sub(r"-+", "-", normalized).strip("-")
    return normalized


def is_backup_like_name(name: str) -> bool:
    normalized = normalize_name(name)
    return bool(re.search(r"(?:^|-)(backup|copy|old)(?:-|$)", normalized))


def parse_github_repo(link: str) -> tuple[str, str] | None:
    parsed = urlparse(link.strip())
    host = parsed.netloc.lower().replace("www.", "")
    if host != "github.com":
        return None
    parts = [part for part in parsed.path.strip("/").split("/") if part]
    if len(parts) < 2:
        return None
    owner, repo = parts[0], parts[1]
    if repo.endswith(".git"):
        repo = repo[:-4]
    return owner, repo


def is_original_repo(link: str, github_username: str, cache: dict[str, bool]) -> bool:
    repo_ref = parse_github_repo(link)
    if not repo_ref:
        return True

    owner, repo = repo_ref
    if github_username and owner.lower() != github_username.lower():
        return False

    cache_key = f"{owner.lower()}/{repo.lower()}"
    if cache_key in cache:
        return cache[cache_key]

    api_url = f"https://api.github.com/repos/{owner}/{repo}"
    request = Request(api_url, headers={"Accept": "application/vnd.github+json", "User-Agent": "portfolio-builder"})

    try:
        with urlopen(request, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
            is_fork = bool(payload.get("fork", False))
            cache[cache_key] = not is_fork
            return not is_fork
    except Exception:
        cache[cache_key] = True
        return True


def deduplicate_projects(projects: list[dict[str, object]], max_projects: int) -> list[dict[str, object]]:
    unique_by_key: dict[str, dict[str, object]] = {}

    for project in projects:
        link = str(project.get("link", "")).strip()
        name = str(project.get("name", "")).strip()
        canonical_name = canonical_name_key(name)
        key = f"name:{canonical_name}" if canonical_name else (canonical_github_link(link) or "name:")

        current = unique_by_key.get(key)
        if not current:
            unique_by_key[key] = project
            continue

        current_is_backup = is_backup_like_name(str(current.get("name", "")))
        incoming_is_backup = is_backup_like_name(str(project.get("name", "")))

        if current_is_backup and not incoming_is_backup:
            unique_by_key[key] = project
            continue
        if incoming_is_backup and not current_is_backup:
            continue

        current_desc_len = len(str(current.get("description", "")))
        incoming_desc_len = len(str(project.get("description", "")))
        current_skills_len = len(current.get("skills", []) if isinstance(current.get("skills"), list) else [])
        incoming_skills_len = len(project.get("skills", []) if isinstance(project.get("skills"), list) else [])

        if incoming_desc_len > current_desc_len or incoming_skills_len > current_skills_len:
            unique_by_key[key] = project

    deduped = list(unique_by_key.values())
    deduped.sort(key=lambda item: str(item.get("name", "")).lower())
    return deduped[:max_projects]


def project_quality_score(project: dict[str, object], preferred_projects: list[str]) -> int:
    name = normalize_name(str(project.get("name", "")))
    description = str(project.get("description", ""))
    skills = project.get("skills", []) if isinstance(project.get("skills"), list) else []
    link = str(project.get("link", "")).strip()

    score = 0
    if name in preferred_projects:
        score += 1000

    score += min(len(skills), 6) * 12
    score += min(len(description), 220) // 12

    priority_tags = {"AI", "LLMs", "RAG", "Backend", "DevOps", "Computer Vision", "Full Stack"}
    score += len([tag for tag in skills if str(tag) in priority_tags]) * 10

    if link.startswith("https://github.com/"):
        score += 8

    return score


def rank_projects(projects: list[dict[str, object]], cfg: BuilderConfig) -> list[dict[str, object]]:
    ranked = sorted(
        projects,
        key=lambda project: (
            -project_quality_score(project, cfg.preferred_projects),
            str(project.get("name", "")).lower(),
        ),
    )
    return ranked[: cfg.max_projects]


def collect_owned_github_projects(cfg: BuilderConfig) -> list[dict[str, object]]:
    if not cfg.github_username:
        return []

    api_url = (
        f"https://api.github.com/users/{cfg.github_username}/repos"
        "?type=owner&sort=updated&per_page=100"
    )
    request = Request(api_url, headers={"Accept": "application/vnd.github+json", "User-Agent": "portfolio-builder"})

    try:
        with urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception:
        return []

    if not isinstance(payload, list):
        return []

    projects: list[dict[str, object]] = []
    for repo in payload:
        if not isinstance(repo, dict):
            continue
        if bool(repo.get("fork", False)):
            continue

        name = str(repo.get("name", "")).strip()
        if not name:
            continue
        if name.lower() in cfg.exclude_projects:
            continue

        description = str(repo.get("description") or "").strip()
        summary = description[:220] if description else "Original repository developed and maintained by me."
        link = str(repo.get("html_url") or f"https://github.com/{cfg.github_username}/{name}")
        inferred = infer_skills(name, f"{description} {repo.get('topics', [])}")

        projects.append(
            {
                "name": name,
                "description": summary,
                "link": link,
                "skills": inferred,
            }
        )

        if len(projects) >= cfg.github_fallback_limit:
            break

    return projects


def collect_preferred_github_projects(
    cfg: BuilderConfig,
    existing_projects: list[dict[str, object]],
) -> list[dict[str, object]]:
    if not cfg.github_username or not cfg.preferred_projects:
        return []

    existing_names = {normalize_name(str(project.get("name", ""))) for project in existing_projects}
    projects: list[dict[str, object]] = []

    for preferred in cfg.preferred_projects:
        repo_name = preferred.strip()
        if not repo_name:
            continue
        if normalize_name(repo_name) in existing_names:
            continue

        api_url = f"https://api.github.com/repos/{cfg.github_username}/{repo_name}"
        request = Request(api_url, headers={"Accept": "application/vnd.github+json", "User-Agent": "portfolio-builder"})

        try:
            with urlopen(request, timeout=10) as response:
                repo = json.loads(response.read().decode("utf-8"))
        except Exception:
            continue

        if not isinstance(repo, dict):
            continue
        if bool(repo.get("fork", False)):
            continue

        name = str(repo.get("name", "")).strip()
        if not name:
            continue
        if normalize_name(name) in cfg.exclude_projects:
            continue

        description = str(repo.get("description") or "").strip()
        summary = description[:220] if description else "Original repository developed and maintained by me."
        link = str(repo.get("html_url") or f"https://github.com/{cfg.github_username}/{name}")
        inferred = infer_skills(name, f"{description} {repo.get('topics', [])}")

        projects.append(
            {
                "name": name,
                "description": summary,
                "link": link,
                "skills": inferred,
            }
        )

    return projects


def collect_projects(root: Path, cfg: BuilderConfig) -> list[dict[str, object]]:
    projects: list[dict[str, object]] = []
    this_repo_name = normalize_name(root.name)
    ownership_cache: dict[str, bool] = {}

    for scan_path in cfg.scan_paths:
        base = (root / scan_path).resolve()
        if not base.exists() or not base.is_dir():
            continue

        for child in sorted(base.iterdir(), key=lambda item: item.name.lower()):
            if not child.is_dir():
                continue
            if child.name.startswith("."):
                continue
            child_name = normalize_name(child.name)
            if child_name in cfg.skip_projects:
                continue
            if child_name == this_repo_name:
                continue
            if child_name in cfg.exclude_projects:
                continue

            readme = find_readme(child)
            if not readme:
                continue

            content = readme.read_text(encoding="utf-8", errors="ignore")
            summary = summarize_readme(content)
            skills = infer_skills(child.name, content)
            link = resolve_repo_link(child.name, cfg)

            if link and not is_original_repo(link, cfg.github_username, ownership_cache):
                continue

            projects.append(
                {
                    "name": child.name,
                    "description": summary,
                    "link": link,
                    "skills": skills,
                }
            )

    projects.extend(collect_preferred_github_projects(cfg, projects))

    if len(projects) < max(4, cfg.max_projects // 2):
        projects.extend(collect_owned_github_projects(cfg))

    deduped = deduplicate_projects(projects, cfg.max_projects * 3)
    return rank_projects(deduped, cfg)


def write_output(root: Path, projects: list[dict[str, object]]) -> Path:
    output_path = root / "src" / "generated" / "projects.ts"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    generated_at = datetime.now(timezone.utc).isoformat()
    serialized_projects = json.dumps(projects, indent=2)
    content = (
        f"export const generatedAt = {json.dumps(generated_at)};\n\n"
        f"export const generatedProjects = {serialized_projects} as const;\n"
    )
    output_path.write_text(content, encoding="utf-8")
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate Astro project list from parent repositories")
    parser.add_argument("--root", default=".", help="Repository root where src/generated/projects.ts will be written")
    parser.add_argument(
        "--config",
        default="portfolio_builder.json",
        help="Path to builder config JSON (relative to root unless absolute)",
    )
    args = parser.parse_args()

    root = Path(args.root).resolve()
    config_path = Path(args.config)
    if not config_path.is_absolute():
        config_path = root / config_path

    cfg = load_config(root, config_path)
    projects = collect_projects(root, cfg)
    output = write_output(root, projects)

    print(f"Generated {len(projects)} projects at {output}")


if __name__ == "__main__":
    main()
