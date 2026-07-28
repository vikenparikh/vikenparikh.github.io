"""Additional pure-function unit tests for scripts/portfolio_builder.py.

Companion to test_portfolio_builder.py. These cover network-free branches that
the existing suite leaves uncovered: find_readme, canonical_github_link, the
non-network branches of is_original_repo (non-github link, owner mismatch,
cache-hit short-circuit), a few summarize_readme/infer_skills edge branches,
and the deduplicate_projects tie-break / backup-name paths.

NO network is touched: is_original_repo is only exercised on paths that return
BEFORE the urlopen call (or via a pre-seeded cache), so no HTTP request is made.

Run with either:
    python3 -m unittest discover -s tests -v
    pytest tests/
"""

import pathlib
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "scripts"))
import portfolio_builder as pb  # noqa: E402


def _make_cfg(**overrides):
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


class FindReadmeTests(unittest.TestCase):
    def test_find_readme_returns_first_candidate(self):
        with tempfile.TemporaryDirectory() as d:
            root = pathlib.Path(d)
            (root / "README.md").write_text("hi", encoding="utf-8")
            self.assertEqual(pb.find_readme(root), root / "README.md")

    def test_find_readme_case_variant(self):
        # README.md absent; lowercase variant present -> still found.
        with tempfile.TemporaryDirectory() as d:
            root = pathlib.Path(d)
            (root / "readme.md").write_text("hi", encoding="utf-8")
            self.assertEqual(pb.find_readme(root), root / "readme.md")

    def test_find_readme_missing_returns_none(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertIsNone(pb.find_readme(pathlib.Path(d)))

    def test_find_readme_ignores_directory_named_readme(self):
        # A directory named like a candidate must not be treated as the file.
        with tempfile.TemporaryDirectory() as d:
            root = pathlib.Path(d)
            (root / "README.md").mkdir()
            self.assertIsNone(pb.find_readme(root))


class CanonicalGithubLinkTests(unittest.TestCase):
    def test_canonical_github_link_empty(self):
        self.assertEqual(pb.canonical_github_link(""), "")

    def test_canonical_github_link_strips_www_trailing_slash_and_lowercases(self):
        self.assertEqual(
            pb.canonical_github_link("https://www.GitHub.com/User/Repo/"),
            "github.com/user/repo",
        )

    def test_canonical_github_link_no_scheme_path_only(self):
        # No netloc -> host is empty; path is preserved (lowercased, no trailing /).
        self.assertEqual(pb.canonical_github_link("Some/Local/Path/"), "some/local/path")


class SummarizeReadmeEdgeTests(unittest.TestCase):
    def test_summarize_readme_skips_image_lines(self):
        content = (
            "![banner](img.png)\n"
            "This is the real long description sentence that survives all filters."
        )
        result = pb.summarize_readme(content)
        self.assertEqual(
            result, "This is the real long description sentence that survives all filters."
        )

    def test_summarize_readme_drops_short_lines(self):
        # Lines shorter than 30 chars are noise; only the long one survives.
        content = "too short\nAnother tiny bit\nThis sentence is definitely long enough to keep around."
        result = pb.summarize_readme(content)
        self.assertEqual(result, "This sentence is definitely long enough to keep around.")

    def test_summarize_readme_strips_markdown_link_and_bold(self):
        content = "See **the [awesome docs](http://x) here** for full project details today."
        result = pb.summarize_readme(content)
        self.assertNotIn("**", result)
        self.assertNotIn("http://x", result)
        self.assertIn("project details", result)


class InferSkillsEdgeTests(unittest.TestCase):
    def test_infer_skills_multiword_keyword(self):
        # "full stack" is a multi-word keyword: matched via substring, not \b.
        self.assertIn("Full Stack", pb.infer_skills("", "we built a full stack platform"))

    def test_infer_skills_dotted_keyword(self):
        # "next.js" contains a dot -> substring-match path.
        self.assertIn("Frontend", pb.infer_skills("", "built with next.js and tailwind"))

    def test_infer_skills_name_contributes_to_corpus(self):
        # Keyword present only in the name still triggers a rule.
        skills = pb.infer_skills("docker-deploy-tool", "")
        self.assertIn("DevOps", skills)

    def test_summarize_readme_caps_at_five_lines(self):
        # Six distinct long paragraphs; the loop breaks after 5 are collected,
        # then the first sentence is returned. Exercises the `>= 5` break.
        paras = [
            f"Paragraph number {n} is written to be comfortably over thirty chars long."
            for n in range(6)
        ]
        result = pb.summarize_readme("\n".join(paras))
        self.assertTrue(result.startswith("Paragraph number 0"))

    def test_summarize_readme_bang_prefixed_sentence_is_noise(self):
        # A line beginning with '!' is noise (is_noisy_sentence startswith "!"),
        # so it is dropped and the following real line survives.
        content = (
            "!important not a real sentence but plenty long enough to pass length\n"
            "This genuine description sentence is long enough and should survive."
        )
        result = pb.summarize_readme(content)
        self.assertEqual(
            result, "This genuine description sentence is long enough and should survive."
        )

    def test_summarize_readme_truncates_on_word_boundary(self):
        # One long sentence with spaces past 220 chars -> cut > 100 branch:
        # trimmed back to the last space and an ellipsis appended.
        words = ("alpha " * 60).strip() + "."  # 60 * 6 = 360 chars, spaced
        result = pb.summarize_readme(words)
        self.assertTrue(result.endswith("…"))
        self.assertNotIn("  ", result)
        self.assertLessEqual(len(result), 221)
        # Word-boundary cut: should not end mid-token before the ellipsis.
        self.assertTrue(result[:-1].endswith("alpha"))

    def test_infer_skills_empty_keyword_token_is_false(self):
        # An empty/whitespace corpus with a name that has no keywords hits the
        # default. This drives has_keyword's empty-token guard indirectly and
        # confirms the default fallback path.
        self.assertEqual(pb.infer_skills("   ", "   "), ["Backend", "AI"])


class IsOriginalRepoNonNetworkTests(unittest.TestCase):
    def test_non_github_link_is_original(self):
        # parse_github_repo returns None -> True, no network.
        self.assertTrue(pb.is_original_repo("https://gitlab.com/u/r", "viken", {}))

    def test_empty_link_is_original(self):
        self.assertTrue(pb.is_original_repo("", "viken", {}))

    def test_owner_mismatch_is_not_original(self):
        # owner != github_username -> False before any HTTP call.
        self.assertFalse(
            pb.is_original_repo("https://github.com/someoneelse/repo", "viken", {})
        )

    def test_cache_hit_short_circuits_true(self):
        cache = {"viken/repo": True}
        self.assertTrue(
            pb.is_original_repo("https://github.com/viken/repo", "viken", cache)
        )

    def test_cache_hit_short_circuits_false(self):
        # Pre-seeded fork verdict is returned without touching the network.
        cache = {"viken/repo": False}
        self.assertFalse(
            pb.is_original_repo("https://github.com/viken/repo", "viken", cache)
        )

    def test_no_username_owner_check_skipped_uses_cache(self):
        # Empty username skips the owner-mismatch branch; cache still short-circuits.
        cache = {"anyowner/repo": True}
        self.assertTrue(
            pb.is_original_repo("https://github.com/AnyOwner/Repo", "", cache)
        )


class DeduplicateTieBreakTests(unittest.TestCase):
    def test_incoming_backup_is_dropped_in_favor_of_current(self):
        projects = [
            {"name": "Proj", "description": "d", "link": "", "skills": ["A"]},
            {"name": "Proj-backup-20240101", "description": "much longer desc", "link": "", "skills": ["A", "B"]},
        ]
        deduped = pb.deduplicate_projects(projects, 24)
        self.assertEqual(len(deduped), 1)
        # Current (non-backup) wins even though the incoming backup is richer.
        self.assertEqual(deduped[0]["name"], "Proj")

    def test_richer_incoming_replaces_current_on_skills(self):
        projects = [
            {"name": "Proj", "description": "same", "link": "", "skills": ["A"]},
            {"name": "Proj-copy", "description": "same", "link": "", "skills": ["A", "B", "C"]},
        ]
        deduped = pb.deduplicate_projects(projects, 24)
        self.assertEqual(len(deduped), 1)
        # Neither is backup-like via the (^|-)backup|copy|old check? "copy" IS.
        # current is non-backup, incoming "-copy" is backup-like -> incoming dropped.
        self.assertEqual(deduped[0]["name"], "Proj")

    def test_richer_incoming_replaces_when_neither_backup(self):
        projects = [
            {"name": "Proj", "description": "short", "link": "", "skills": ["A"]},
            {"name": "Proj", "description": "a substantially longer description wins", "link": "", "skills": ["A"]},
        ]
        deduped = pb.deduplicate_projects(projects, 24)
        self.assertEqual(len(deduped), 1)
        # Same canonical key, neither backup-like, longer description wins.
        self.assertEqual(deduped[0]["description"], "a substantially longer description wins")

    def test_link_keyed_when_name_empty(self):
        # Empty names -> canonical_name empty -> key falls back to canonical link.
        projects = [
            {"name": "", "description": "one", "link": "https://github.com/x/y", "skills": []},
            {"name": "", "description": "two longer entry here", "link": "https://github.com/x/y", "skills": []},
        ]
        deduped = pb.deduplicate_projects(projects, 24)
        self.assertEqual(len(deduped), 1)

    def test_current_backup_replaced_by_non_backup_incoming(self):
        projects = [
            {"name": "Proj-backup-1", "description": "d", "link": "", "skills": []},
            {"name": "Proj", "description": "d", "link": "", "skills": []},
        ]
        deduped = pb.deduplicate_projects(projects, 24)
        self.assertEqual(len(deduped), 1)
        self.assertEqual(deduped[0]["name"], "Proj")


if __name__ == "__main__":
    unittest.main()
