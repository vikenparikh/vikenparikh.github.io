# Root

This repo powers my personal website at https://vikenparikh.github.io. It auto-generates a portfolio site from project READMEs using unified_docs + MkDocs. Edit unified_docs.json for profile details, skills, project links/summaries/images, scan_paths, and resume auto-sync setting

[← Back to portfolio](../index.md)

## README

<details open>
<summary>Expand/collapse full README</summary>

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

## Architecture

- `unified_docs/`: generator framework (collection, combining, site build)
- `docs/`: generated Markdown + portfolio styling
- `site/`: generated static output for deployment
- `legacy_site/`: archived old static HTML/PHP implementation


</details>
