# unified-docs-site

Simple root-folder docs generator.

## Structure

```text
All_Project_docs_website/
  unified_docs/
    __init__.py
    cli.py
    collector.py
    combiner.py
    github_repos.py
    portfolio_enhancer.py
    site_generator.py
  README.md
  requirements.txt
  setup.cfg
  mkdocs.yml
  unified_docs.json
  .github/
    workflows/
      deploy.yml
```

## What it does

- Scans this repository root for `README*.md` files.
- Creates `ALL_DOCS.md` at the root.
- Creates mirrored pages in `docs/` (`docs/<project>/index.md`, with `docs/root/index.md` for root).
- Builds static site output in `site/`.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -e .
```

## Run

```bash
unified-docs docs-only --root .
unified-docs build --root .
```

Fallback (without install):

```bash
python -m unified_docs.cli docs-only --root .
python -m unified_docs.cli build --root .
```

## Preview

```bash
mkdocs serve
```

Open `http://127.0.0.1:8000`.

## Config

Edit `unified_docs.json`:

- `skip_projects`: folders to ignore (relative to `--root`).
- `project_github`: map folder path to a GitHub URL; matching page gets a GitHub banner.
- `github_username`: GitHub username to fetch repos from.
- `include_public_repos`: when `true`, includes only public repos in the home page section.

## Hosting (GitHub Pages)

- The workflow at `.github/workflows/deploy.yml` builds docs with `unified-docs build --root .`.
- It publishes the generated `site/` directory.
- In GitHub, set Pages source to GitHub Actions.
