# Portfolio Generator

A small CLI that builds a full portfolio website from your repo READMEs.

## One-time setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -e .
```

## Build / rebuild

```bash
unified-docs build --root .
```

This regenerates:
- `ALL_DOCS.md`
- `docs/` (portfolio pages)
- `site/` (static website)

## Local preview

```bash
mkdocs serve
```

Open `http://127.0.0.1:8000`.

## Customize

Edit `unified_docs.json`:
- `profile` for name/title/photo/resume
- `skills`
- `project_github`, `project_summaries`, `project_images`
- `skip_projects`
