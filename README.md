# Viken Parikh — Personal Website

This repo powers my personal website at https://vikenparikh.github.io.  
It auto-generates a portfolio site from project READMEs using `unified_docs` + MkDocs.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -e .
```

## Build

```bash
unified-docs build --root .
```

## Preview

```bash
mkdocs serve
```

## Personalization

Edit `unified_docs.json` for profile details, skills, project links/summaries/images, `scan_paths`, and resume auto-sync settings.
