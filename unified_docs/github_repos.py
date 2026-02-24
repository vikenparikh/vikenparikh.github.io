from __future__ import annotations

from dataclasses import dataclass
import json
import urllib.error
import urllib.parse
import urllib.request


@dataclass
class PublicRepo:
    name: str
    html_url: str
    description: str


def list_public_repos(username: str) -> list[PublicRepo]:
    repos: list[PublicRepo] = []

    encoded_user = urllib.parse.quote(username)
    page = 1
    per_page = 100

    while True:
        url = (
            f"https://api.github.com/users/{encoded_user}/repos"
            f"?type=public&sort=full_name&per_page={per_page}&page={page}"
        )
        request = urllib.request.Request(
            url,
            headers={
                "Accept": "application/vnd.github+json",
                "User-Agent": "unified-docs-site",
            },
        )

        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            return repos

        if not isinstance(payload, list) or not payload:
            break

        for item in payload:
            if not isinstance(item, dict):
                continue

            if item.get("private") is True:
                continue

            name = item.get("name")
            html_url = item.get("html_url")
            description = item.get("description") or ""

            if isinstance(name, str) and isinstance(html_url, str):
                repos.append(PublicRepo(name=name, html_url=html_url, description=str(description)))

        if len(payload) < per_page:
            break

        page += 1

    return repos
