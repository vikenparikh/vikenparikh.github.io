"""Characterization tests for scripts/portfolio_builder.py pure functions.

These tests pin CURRENT behavior. They do NOT touch the network (none of the
collect_* / is_original_repo functions are exercised) and never write outside a
TemporaryDirectory. A module-level snapshot guard proves the real
src/generated/projects.ts is byte-identical after the run.

Run with either:
    python3 -m unittest discover -s tests -v
    pytest tests/
"""

import hashlib
import json
import pathlib
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "scripts"))
import portfolio_builder as pb  # noqa: E402


REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
REAL_PROJECTS_TS = REPO_ROOT / "src" / "generated" / "projects.ts"

# Snapshot of the real generated file taken at import time. tearDownModule
# asserts it is byte-identical, proving no test wrote to the real repo path.
_REAL_TS_EXISTED = REAL_PROJECTS_TS.exists()
_REAL_TS_HASH = (
    hashlib.sha256(REAL_PROJECTS_TS.read_bytes()).hexdigest() if _REAL_TS_EXISTED else None
)


def setUpModule():
    # Recorded above at import; nothing extra needed here, but keep an explicit
    # hook so the snapshot intent is obvious.
    assert _REAL_TS_EXISTED, "expected real src/generated/projects.ts to exist before tests"


def tearDownModule():
    assert REAL_PROJECTS_TS.exists() == _REAL_TS_EXISTED, "real projects.ts existence changed"
    if _REAL_TS_EXISTED:
        after = hashlib.sha256(REAL_PROJECTS_TS.read_bytes()).hexdigest()
        assert after == _REAL_TS_HASH, "real src/generated/projects.ts was modified by tests"


def _make_cfg(**overrides):
    """Build a BuilderConfig by hand (no network, no file IO)."""
    defaults = dict(
        scan_paths=[],
        skip_projects=set(),
        exclude_projects=set(),
        github_username="",
        project_github={},
        max_projects=24,
        preferred_projects=[],
        github_fallback_limit=30,
    )
    defaults.update(overrides)
    return pb.BuilderConfig(**defaults)


class NormalizeNameTests(unittest.TestCase):
    def test_normalize_name_basic(self):
        self.assertEqual(pb.normalize_name("My Cool Project!"), "my-cool-project")

    def test_normalize_name_collapses_and_strips(self):
        self.assertEqual(pb.normalize_name("  __Foo  Bar__  "), "foo-bar")

    def test_normalize_name_empty(self):
        self.assertEqual(pb.normalize_name("!!!"), "")


class LoadConfigTests(unittest.TestCase):
    def test_load_config_missing_file_defaults(self):
        cfg = pb.load_config(pathlib.Path("."), pathlib.Path("/does/not/exist.json"))
        self.assertEqual(cfg.scan_paths, [".."])
        self.assertEqual(cfg.max_projects, 24)
        self.assertEqual(cfg.github_fallback_limit, 30)
        self.assertEqual(cfg.skip_projects, set())
        self.assertEqual(cfg.exclude_projects, set())
        self.assertEqual(cfg.preferred_projects, [])
        self.assertEqual(cfg.project_github, {})
        self.assertEqual(cfg.github_username, "")

    def test_load_config_coerces_and_normalizes(self):
        with tempfile.TemporaryDirectory() as d:
            cfg_path = pathlib.Path(d) / "cfg.json"
            cfg_path.write_text(
                json.dumps(
                    {
                        "max_projects": "10",
                        "github_fallback_limit": "5",
                        "skip_projects": ["Skip Me!"],
                        "preferred_projects": ["Pref Project"],
                    }
                ),
                encoding="utf-8",
            )
            cfg = pb.load_config(pathlib.Path(d), cfg_path)
        self.assertIsInstance(cfg.max_projects, int)
        self.assertEqual(cfg.max_projects, 10)
        self.assertIsInstance(cfg.github_fallback_limit, int)
        self.assertEqual(cfg.github_fallback_limit, 5)
        self.assertEqual(cfg.skip_projects, {"skip-me"})
        self.assertEqual(cfg.preferred_projects, ["pref-project"])


class SummarizeReadmeTests(unittest.TestCase):
    def test_summarize_readme_basic_paragraph(self):
        body = "This project is a comprehensive backend service for data processing."
        self.assertEqual(pb.summarize_readme(body), body)

    def test_summarize_readme_strips_code_fences(self):
        content = (
            "```\n"
            "some secret installation code that is long enough to survive filters\n"
            "```\n"
            "This is the actual description of the project here today."
        )
        result = pb.summarize_readme(content)
        self.assertEqual(result, "This is the actual description of the project here today.")
        self.assertNotIn("secret", result)

    def test_summarize_readme_truncation(self):
        # Single long token (no spaces): rfind(" ") == -1, so the 220-char slice
        # is kept verbatim and the ellipsis char is appended -> length 221.
        long_sentence = "A" * 230 + "."
        result = pb.summarize_readme(long_sentence)
        self.assertTrue(result.endswith("…"))
        self.assertLessEqual(len(result), 221)

    def test_summarize_readme_empty_returns_fallback(self):
        fallback = "Project repository with implementation details and documentation."
        self.assertEqual(pb.summarize_readme(""), fallback)
        # Heading-only input: lines starting with "#" are skipped wholesale
        # (the in-clean_line "^#+" strip is dead code), so this also falls back.
        self.assertEqual(pb.summarize_readme("# My Project\n## Section"), fallback)

    def test_summarize_readme_filters_noise_sections(self):
        content = (
            "Installation\n"
            "Run the following command to install the package right now."
        )
        result = pb.summarize_readme(content)
        # The "Installation" header line is dropped; the next real line survives.
        self.assertEqual(result, "Run the following command to install the package right now.")
        self.assertFalse(result.lower().startswith("installation"))


class InferSkillsTests(unittest.TestCase):
    def test_infer_skills_keyword_match(self):
        self.assertIn("Frontend", pb.infer_skills("", "this app uses react heavily"))

    def test_infer_skills_word_boundary(self):
        # "airplane" must NOT trigger the "ai" word-boundary rule. We include a
        # non-AI keyword ("react") so the corpus matches at least one rule and
        # avoids the ["Backend", "AI"] empty-default path -- that way the
        # absence of "AI" genuinely reflects the word-boundary check.
        self.assertNotIn("AI", pb.infer_skills("", "airplane react"))
        # "ai agent" (standalone "ai" token) does trigger it.
        self.assertIn("AI", pb.infer_skills("", "ai agent"))

    def test_infer_skills_default(self):
        self.assertEqual(pb.infer_skills("", ""), ["Backend", "AI"])

    def test_infer_skills_caps_at_six(self):
        text = (
            "full stack backend frontend react docker ai llm rag python "
            "machine learning deep learning nlp opencv aws java"
        )
        skills = pb.infer_skills("everything", text)
        self.assertLessEqual(len(skills), 6)


class ResolveRepoLinkTests(unittest.TestCase):
    def test_resolve_repo_link_direct(self):
        cfg = _make_cfg(project_github={"My Proj": "https://x/direct"})
        self.assertEqual(pb.resolve_repo_link("My Proj", cfg), "https://x/direct")

    def test_resolve_repo_link_normalized_fallback(self):
        cfg = _make_cfg(project_github={"My Proj": "https://x/direct"})
        # Direct lookup misses ("my-proj" != "My Proj"); normalized loop matches.
        self.assertEqual(pb.resolve_repo_link("my-proj", cfg), "https://x/direct")

    def test_resolve_repo_link_username_fallback(self):
        cfg = _make_cfg(github_username="viken")
        self.assertEqual(
            pb.resolve_repo_link("Other", cfg), "https://github.com/viken/Other"
        )

    def test_resolve_repo_link_empty(self):
        cfg = _make_cfg()
        self.assertEqual(pb.resolve_repo_link("Other", cfg), "")


class ParseGithubRepoTests(unittest.TestCase):
    def test_parse_github_repo_valid_and_git_suffix(self):
        self.assertEqual(
            pb.parse_github_repo("https://github.com/u/r.git"), ("u", "r")
        )

    def test_parse_github_repo_rejects_non_github_and_short(self):
        self.assertIsNone(pb.parse_github_repo("https://gitlab.com/u/r"))
        self.assertIsNone(pb.parse_github_repo("https://github.com/onlyone"))


class CanonicalNameKeyTests(unittest.TestCase):
    def test_canonical_name_key_strips_backup_suffixes(self):
        self.assertEqual(pb.canonical_name_key("proj-backup-20240101"), "proj")
        self.assertEqual(pb.canonical_name_key("proj-copy"), "proj")


class IsBackupLikeNameTests(unittest.TestCase):
    def test_is_backup_like_name(self):
        self.assertTrue(pb.is_backup_like_name("x-backup"))
        self.assertTrue(pb.is_backup_like_name("old-x"))
        self.assertFalse(pb.is_backup_like_name("backend"))


class DeduplicateProjectsTests(unittest.TestCase):
    def test_deduplicate_prefers_non_backup_and_richer(self):
        projects = [
            {
                "name": "Proj-backup-20240101",
                "description": "short",
                "link": "",
                "skills": ["A"],
            },
            {
                "name": "Proj",
                "description": "a much longer richer description here for sure",
                "link": "",
                "skills": ["A", "B", "C"],
            },
        ]
        deduped = pb.deduplicate_projects(projects, 24)
        # Both share canonical key "proj" -> collapse to one; the non-backup,
        # richer entry wins.
        self.assertEqual(len(deduped), 1)
        self.assertEqual(deduped[0]["name"], "Proj")

    def test_deduplicate_sorted_and_capped(self):
        projects = [
            {"name": "Zeta", "description": "", "link": "", "skills": []},
            {"name": "Alpha", "description": "", "link": "", "skills": []},
            {"name": "Mu", "description": "", "link": "", "skills": []},
        ]
        deduped = pb.deduplicate_projects(projects, 2)
        self.assertEqual(len(deduped), 2)
        # Sorted by lowercased name before the cap.
        self.assertEqual([p["name"] for p in deduped], ["Alpha", "Mu"])


class ProjectQualityScoreTests(unittest.TestCase):
    def test_project_quality_score_preferred_boost(self):
        preferred = pb.project_quality_score(
            {"name": "Pref", "description": "", "skills": [], "link": ""}, ["pref"]
        )
        non_preferred = pb.project_quality_score(
            {
                "name": "Other",
                "description": "d" * 220,
                "skills": ["AI", "LLMs", "RAG", "Backend", "DevOps", "Full Stack"],
                "link": "https://github.com/x/y",
            },
            ["pref"],
        )
        self.assertGreaterEqual(preferred, 1000)
        self.assertGreater(preferred, non_preferred)


class RankProjectsTests(unittest.TestCase):
    def test_rank_projects_respects_max(self):
        projects = [
            {"name": f"p{i}", "description": "", "link": "", "skills": []}
            for i in range(10)
        ]
        cfg = _make_cfg(max_projects=3)
        ranked = pb.rank_projects(projects, cfg)
        self.assertEqual(len(ranked), 3)

    def test_rank_projects_highest_score_first(self):
        projects = [
            {"name": "low", "description": "", "link": "", "skills": []},
            {
                "name": "high",
                "description": "d" * 100,
                "skills": ["AI", "Backend"],
                "link": "https://github.com/x/y",
            },
        ]
        cfg = _make_cfg(max_projects=24)
        ranked = pb.rank_projects(projects, cfg)
        self.assertEqual(ranked[0]["name"], "high")


class WriteOutputTests(unittest.TestCase):
    def test_write_output_in_tmpdir(self):
        with tempfile.TemporaryDirectory() as d:
            tmp_root = pathlib.Path(d)
            projects = [
                {
                    "name": "Demo",
                    "description": "A demo project.",
                    "link": "https://github.com/x/demo",
                    "skills": ["Backend"],
                }
            ]
            out = pb.write_output(tmp_root, projects)
            expected = tmp_root / "src" / "generated" / "projects.ts"
            self.assertEqual(out, expected)
            self.assertTrue(expected.exists())
            text = expected.read_text(encoding="utf-8")
            self.assertIn("export const generatedProjects", text)
            self.assertIn("as const", text)
            self.assertIn("generatedAt", text)


if __name__ == "__main__":
    unittest.main()
