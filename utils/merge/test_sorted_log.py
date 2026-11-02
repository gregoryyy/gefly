"""Tests for the newest-first log merge driver (standard library only)."""

from contextlib import redirect_stderr
import io
import os
import re
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sorted_log  # noqa: E402


DRIVER = Path(__file__).resolve().parent / "sorted_log.py"
JUSTFILE = Path(__file__).resolve().parents[2] / "justfile"


def setup_config():
    """Read the merge-driver settings from the justfile setup recipe."""
    found = {}
    for line in JUSTFILE.read_text(encoding="utf-8").splitlines():
        match = re.search(r"config (merge\.sorted-log\.\w+) (?:\"([^\"]*)\"|'([^']*)'|(\S+))$", line)
        if match:
            found[match.group(1)] = next(group for group in match.groups()[1:] if group is not None)
    return found


SETUP = setup_config()
PRE = "# Progress log\n\nNew entries go above previous entries.\n\n"


def entry(stamp, title, body="Body."):
    return f"## {stamp} — {title}\n\n{body}\n"


def log(*entries, preamble=PRE):
    return preamble + "\n".join(entries)


A = entry("2026-11-01 10:00", "A")
B = entry("2026-11-01 11:00", "B")
C = entry("2026-11-01 12:00", "C")
D = entry("2026-11-01 13:00", "D")


def headings(text):
    return [line for line in text.split("\n") if line.startswith("## ")]


class MergeLogsTest(unittest.TestCase):
    def merge(self, ours, base, theirs):
        return sorted_log.merge_logs(ours, base, theirs)

    def test_both_sides_prepend_one_entry(self):
        base = log(B, A)
        text, clean = self.merge(log(C, B, A), base, log(D, B, A))
        self.assertTrue(clean)
        self.assertEqual(text, log(D, C, B, A))

    def test_identical_addition_on_both_sides(self):
        text, clean = self.merge(log(C, A), log(A), log(C, A))
        self.assertTrue(clean)
        self.assertEqual(text, log(C, A))

    def test_entry_edited_on_one_side(self):
        edited = entry("2026-11-01 11:00", "B", "Edited body.")
        for ours, theirs in ((log(edited, A), log(C, B, A)), (log(C, B, A), log(edited, A))):
            text, clean = self.merge(ours, log(B, A), theirs)
            self.assertTrue(clean)
            self.assertEqual(text, log(C, edited, A))

    def test_same_entry_edited_differently_conflicts(self):
        ours_b = entry("2026-11-01 11:00", "B", "Ours.")
        theirs_b = entry("2026-11-01 11:00", "B", "Theirs.")
        text, clean = self.merge(log(C, ours_b, A), log(B, A), log(theirs_b, A))
        self.assertFalse(clean)
        self.assertIn("<<<<<<< ours\n## 2026-11-01 11:00 — B\n\nOurs.\n", text)
        self.assertIn("||||||| base\n## 2026-11-01 11:00 — B\n\nBody.\n=======\n", text)
        self.assertIn("Theirs.\n>>>>>>> theirs", text)
        # The conflict stays in its chronological slot and other entries are kept.
        self.assertLess(text.index("## 2026-11-01 12:00"), text.index("<<<<<<< ours"))
        self.assertLess(text.index(">>>>>>> theirs"), text.index("## 2026-11-01 10:00"))

    def test_different_additions_under_same_heading_conflict(self):
        ours_c = entry("2026-11-01 12:00", "C", "Ours.")
        theirs_c = entry("2026-11-01 12:00", "C", "Theirs.")
        text, clean = self.merge(log(ours_c, A), log(A), log(theirs_c, A))
        self.assertFalse(clean)
        self.assertNotIn("||||||| base", text)
        self.assertIn("Ours.", text)
        self.assertIn("Theirs.", text)

    def test_delete_unchanged_entry(self):
        for ours, theirs in ((log(A), log(C, B, A)), (log(C, B, A), log(A))):
            text, clean = self.merge(ours, log(B, A), theirs)
            self.assertTrue(clean)
            self.assertEqual(text, log(C, A))

    def test_deleted_on_both_sides(self):
        text, clean = self.merge(log(A), log(B, A), log(A))
        self.assertTrue(clean)
        self.assertEqual(text, log(A))

    def test_deleted_on_both_sides_with_an_addition_falls_back(self):
        with self.assertRaises(sorted_log.MergeError):
            self.merge(log(C, A), log(B, A), log(A))

    def test_rename_on_one_side_versus_delete_on_the_other_falls_back(self):
        renamed = entry("2026-11-01 11:00", "B renamed")
        for ours, theirs in ((log(renamed, A), log(A)), (log(A), log(renamed, A))):
            with self.assertRaises(sorted_log.MergeError):
                self.merge(ours, log(B, A), theirs)

    def test_delete_versus_change_conflicts(self):
        edited = entry("2026-11-01 11:00", "B", "Edited body.")
        for ours, theirs in ((log(A), log(edited, A)), (log(edited, A), log(A))):
            text, clean = self.merge(ours, log(B, A), theirs)
            self.assertFalse(clean)
            self.assertIn("Edited body.", text)
            self.assertIn("||||||| base\n## 2026-11-01 11:00 — B\n\nBody.", text)
            self.assertIn("<<<<<<< ours", text)
            self.assertIn(">>>>>>> theirs", text)

    def test_preamble_edit_on_one_side(self):
        new_pre = "# Progress log\n\nEdited preamble.\n\n"
        text, clean = self.merge(log(B, A, preamble=new_pre), log(A), log(C, A))
        self.assertTrue(clean)
        self.assertEqual(text, log(C, B, A, preamble=new_pre))

    def test_preamble_edits_on_both_sides_merge_by_line(self):
        base = "# Log\n\none\n\ntwo\n\nthree\n\n"
        ours = "# Log\n\nONE\n\ntwo\n\nthree\n\n"
        theirs = "# Log\n\none\n\ntwo\n\nTHREE\n\n"
        text, clean = self.merge(log(A, preamble=ours), log(A, preamble=base), log(A, preamble=theirs))
        self.assertTrue(clean)
        self.assertEqual(text, log(A, preamble="# Log\n\nONE\n\ntwo\n\nTHREE\n\n"))

    def test_preamble_conflict(self):
        text, clean = self.merge(log(A, preamble="# Ours\n\n"), log(A, preamble="# Base\n\n"),
                                 log(A, preamble="# Theirs\n\n"))
        self.assertFalse(clean)
        self.assertIn("<<<<<<< ours\n# Ours\n", text)
        self.assertIn("# Theirs\n>>>>>>> theirs\n\n## 2026-11-01 10:00", text)

    def test_out_of_order_input_is_sorted_newest_first(self):
        text, clean = self.merge(log(A, C), log(A), log(B, A))
        self.assertTrue(clean)
        self.assertEqual(text, log(C, B, A))

    def test_ties_keep_ours_then_theirs_order(self):
        x = entry("2026-11-01 12:00", "X")
        y = entry("2026-11-01 12:00", "Y")
        z = entry("2026-11-01 12:00", "Z")
        text, clean = self.merge(log(y, x, A), log(A), log(z, A))
        self.assertTrue(clean)
        self.assertEqual(text, log(y, x, z, A))

    def test_unstamped_entries_follow_their_predecessor(self):
        notes = "## Notes\n\nNo timestamp.\n"
        top = "## Unreleased\n\nTop.\n"
        text, clean = self.merge(log(top, B, notes, A), log(top, B, notes, A), log(top, C, B, notes, A))
        self.assertTrue(clean)
        self.assertEqual(headings(text), ["## Unreleased", "## 2026-11-01 12:00 — C",
                                          "## 2026-11-01 11:00 — B", "## Notes",
                                          "## 2026-11-01 10:00 — A"])

    def assert_falls_back(self, ours, base, theirs):
        with self.assertRaises(sorted_log.MergeError):
            self.merge(ours, base, theirs)

    def test_duplicate_heading_falls_back(self):
        first = entry("2026-11-01 11:00", "Same", "First.")
        second = entry("2026-11-01 11:00", "Same", "Second.")
        base = log(first, second, A)
        # Both sides deleted a different copy.
        self.assert_falls_back(log(second, A), base, log(first, A))
        # One side inserted a new entry, the other edited one copy.
        edited = entry("2026-11-01 11:00", "Same", "Second edited.")
        self.assert_falls_back(log(C, first, second, A), base, log(first, edited, A))
        # A duplicate in only one version is enough.
        self.assert_falls_back(log(C, A), log(A), log(first, first, A))

    def test_both_sides_remove_base_entry_and_add_entries_falls_back(self):
        # Both sides re-stamped the same entry differently.
        ours_b = entry("2026-11-01 11:05", "B")
        theirs_b = entry("2026-11-01 11:10", "B")
        self.assert_falls_back(log(ours_b, A), log(B, A), log(theirs_b, A))
        # Both renamed it.
        self.assert_falls_back(log(entry("2026-11-01 11:00", "B one"), A), log(B, A),
                               log(entry("2026-11-01 11:00", "B two"), A))

    def test_one_side_renames_entry(self):
        renamed = entry("2026-11-01 11:00", "B renamed")
        text, clean = self.merge(log(renamed, A), log(B, A), log(C, B, A))
        self.assertTrue(clean)
        self.assertEqual(text, log(C, renamed, A))

    def test_fenced_heading_does_not_split_entry(self):
        for fence, close in (("```", "```"), ("~~~", "~~~"), ("```markdown", "```"),
                             ("~~~~ md", "~~~~"), ("````", "````")):
            body = f"Example:\n\n{fence}\n## 2026-11-01 09:00 — not an entry\n\ntext\n{close}\n\nAfter."
            rich = entry("2026-11-01 11:00", "B", body)
            text, clean = self.merge(log(rich, A), log(rich, A), log(C, rich, A))
            self.assertTrue(clean, fence)
            self.assertEqual(text, log(C, rich, A), fence)
            _, entries = sorted_log.split(text)
            self.assertEqual(len(entries), 3, fence)

    def test_shorter_or_other_fence_does_not_close(self):
        body = "````\n```\n~~~\n## 2026-11-01 09:00 — inside\n````"
        rich = entry("2026-11-01 11:00", "B", body)
        _, entries = sorted_log.split(log(rich, A))
        self.assertEqual([h for h, _, _ in entries], ["## 2026-11-01 11:00 — B", "## 2026-11-01 10:00 — A"])

    def test_two_branches_adding_entries_without_base_deletions_stay_clean(self):
        text, clean = self.merge(log(C, entry("2026-11-01 11:30", "C2"), B, A), log(B, A),
                                 log(D, entry("2026-11-01 10:30", "D2"), B, A))
        self.assertTrue(clean)
        self.assertEqual(headings(text), ["## 2026-11-01 13:00 — D", "## 2026-11-01 12:00 — C",
                                          "## 2026-11-01 11:30 — C2", "## 2026-11-01 11:00 — B",
                                          "## 2026-11-01 10:30 — D2", "## 2026-11-01 10:00 — A"])

    def test_original_text_is_emitted_and_trailing_whitespace_compared_loosely(self):
        spaced = entry("2026-11-01 11:00", "B", "Hard break  \nline\t")
        text, clean = self.merge(log(spaced, A), log(spaced, A), log(C, spaced, A))
        self.assertTrue(clean)
        self.assertIn("Hard break  \nline\t\n", text)
        # A trailing-whitespace-only difference is not a change; the other side's edit wins.
        edited = entry("2026-11-01 11:00", "B", "Edited.")
        text, clean = self.merge(log(spaced, A), log(entry("2026-11-01 11:00", "B", "Hard break\nline"), A),
                                 log(edited, A))
        self.assertTrue(clean)
        self.assertEqual(text, log(edited, A))

    def test_entries_separated_by_one_blank_line_and_single_final_newline(self):
        loose = PRE + "## 2026-11-01 11:00 — B\n\nBody.\n\n\n\n" + A + "\n\n\n"
        text, clean = self.merge(loose, log(B, A), log(C, B, A))
        self.assertTrue(clean)
        self.assertEqual(text, log(C, B, A))
        self.assertTrue(text.endswith("Body.\n") and not text.endswith("\n\n"))

    def test_missing_final_newline(self):
        text, clean = self.merge(log(B, A).rstrip("\n"), log(A).rstrip("\n"), log(C, A))
        self.assertTrue(clean)
        self.assertEqual(text, log(C, B, A))

    def test_no_entries(self):
        text, clean = self.merge("# Log\n\nours\n", "# Log\n", "# Log\n")
        self.assertTrue(clean)
        self.assertEqual(text, "# Log\n\nours\n")
        self.assertEqual(self.merge("", "", ""), ("", True))

    def test_body_lines_are_preserved(self):
        rich = entry("2026-11-01 12:00", "C", "TODO: 1.\n\n**Implementation notes**\n\n- one\n  - two\n\n```\n### not a heading\n```")
        text, clean = self.merge(log(rich, A), log(A), log(B, A))
        self.assertTrue(clean)
        self.assertEqual(text, log(rich, B, A))


class DriverTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="sorted-log-test-"))
        self.addCleanup(shutil.rmtree, self.tmp)

    def run_driver(self, ours, base, theirs, binary=False):
        paths = []
        for name, content in (("base", base), ("ours", ours), ("theirs", theirs)):
            path = self.tmp / name
            path.write_bytes(content if binary else content.encode("utf-8"))
            paths.append(str(path))
        result = subprocess.run([sys.executable, str(DRIVER), *paths, "docs/DONE.md"],
                                capture_output=True, check=False)
        return result.returncode, (self.tmp / "ours").read_bytes(), result.stderr.decode()

    def test_clean_merge_exits_zero_and_writes_ours(self):
        code, out, _ = self.run_driver(log(C, A), log(A), log(B, A))
        self.assertEqual(code, 0)
        self.assertEqual(out.decode(), log(C, B, A))

    def test_conflict_exits_one(self):
        ours_b = entry("2026-11-01 11:00", "B", "Ours.")
        theirs_b = entry("2026-11-01 11:00", "B", "Theirs.")
        code, out, err = self.run_driver(log(ours_b), log(B), log(theirs_b))
        self.assertEqual(code, 1)
        self.assertIn(b"<<<<<<< ours", out)
        self.assertIn("conflict markers remain", err)

    def test_crlf_input_keeps_crlf(self):
        crlf = lambda text: text.replace("\n", "\r\n")
        code, out, _ = self.run_driver(crlf(log(C, A)), crlf(log(A)), crlf(log(B, A)))
        self.assertEqual(code, 0)
        self.assertEqual(out.decode(), crlf(log(C, B, A)))

    def test_mixed_line_endings_merge(self):
        code, out, _ = self.run_driver(log(C, A), log(A).replace("\n", "\r\n"), log(B, A))
        self.assertEqual(code, 0)
        self.assertEqual(out.decode(), log(C, B, A))

    def test_existing_markers_fall_back_to_merge_file(self):
        marked = log(C, A) + "<<<<<<< ours\nleft\n=======\nright\n>>>>>>> theirs\n"
        code, out, err = self.run_driver(marked, log(A), log(B, A))
        self.assertEqual(code, 1)
        self.assertIn("falling back", err)
        self.assertIn(b"## 2026-11-01 11:00", out)
        self.assertIn(b"## 2026-11-01 12:00", out)

    def test_invalid_utf8_falls_back_without_losing_content(self):
        ours = log(C, A).encode() + b"\xff\n"
        code, out, err = self.run_driver(ours, log(A).encode(), log(B, A).encode(), binary=True)
        self.assertEqual(code, 1)
        self.assertIn("falling back", err)
        self.assertIn(b"\xff", out)
        self.assertIn(b"## 2026-11-01 11:00", out)
        self.assertIn(b"## 2026-11-01 12:00", out)

    def test_fallback_when_merge_file_is_unavailable(self):
        paths = []
        for name, content in (("base", log(A)), ("ours", log(C, A) + "<<<<<<< x\n"), ("theirs", log(B, A))):
            path = self.tmp / name
            path.write_text(content)
            paths.append(str(path))
        def unavailable(*args):
            raise OSError("no git")
        with patch.object(sorted_log, "merge_file", unavailable), redirect_stderr(io.StringIO()):
            code = sorted_log.main([*paths, "docs/DONE.md"])
        self.assertEqual(code, 1)
        self.assertEqual((self.tmp / "ours").read_text(),
                         "<<<<<<< ours\n" + log(C, A) + "<<<<<<< x\n=======\n" + log(B, A)
                         + ">>>>>>> theirs\n")

    def test_duplicate_heading_driver_falls_back_with_markers(self):
        dup = entry("2026-11-01 11:00", "Same")
        code, out, err = self.run_driver(log(C, dup, dup), log(dup, dup), log(dup))
        self.assertEqual(code, 1)
        self.assertIn("falling back", err)
        self.assertIn(b"## 2026-11-01 12:00", out)

    def test_usage_error(self):
        result = subprocess.run([sys.executable, str(DRIVER)], capture_output=True, check=False)
        self.assertEqual(result.returncode, 2)


@unittest.skipUnless(shutil.which("git"), "git is required for the end-to-end merge test")
class GitEndToEndTest(unittest.TestCase):
    def git(self, *args, check=True, path=None):
        env = {key: value for key, value in os.environ.items() if not key.startswith("GIT_")}
        if path is not None:
            env["PATH"] = path
        env.update(GIT_CONFIG_NOSYSTEM="1", GIT_CONFIG_GLOBAL=os.devnull,
                   GIT_AUTHOR_NAME="t", GIT_AUTHOR_EMAIL="t@example.invalid",
                   GIT_COMMITTER_NAME="t", GIT_COMMITTER_EMAIL="t@example.invalid")
        return subprocess.run([shutil.which("git"), "-C", str(self.repo), *args], capture_output=True,
                              text=True, check=check, env=env)

    def setUp(self):
        self.repo = Path(tempfile.mkdtemp(prefix="sorted-log-repo-"))
        self.addCleanup(shutil.rmtree, self.repo)
        self.git("init", "-q", "-b", "main")
        self.git("config", "merge.sorted-log.name", "Gefly sorted log")
        for key, value in SETUP.items():
            self.git("config", key, value)
        script = self.repo / "utils/merge/sorted_log.py"
        script.parent.mkdir(parents=True)
        shutil.copy(DRIVER, script)
        (self.repo / ".gitattributes").write_text("docs/DONE.md merge=sorted-log\n")
        (self.repo / "docs").mkdir()
        self.done = self.repo / "docs/DONE.md"
        self.done.write_text(log(B, A))
        self.git("add", ".")
        self.git("commit", "-q", "-m", "base")

    def branch(self, name, text):
        self.git("checkout", "-q", "-b", name, "main")
        self.done.write_text(text)
        self.git("commit", "-q", "-am", name)

    def test_two_branches_prepending_merge_cleanly(self):
        self.branch("one", log(C, B, A))
        self.branch("two", log(D, B, A))
        self.git("checkout", "-q", "one")
        result = self.git("merge", "--no-edit", "two", check=False)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(self.done.read_text(), log(D, C, B, A))
        self.assertEqual(self.git("status", "--porcelain").stdout, "")

    def test_setup_recipe_declares_guarded_driver(self):
        self.assertEqual(set(SETUP), {"merge.sorted-log.name", "merge.sorted-log.driver",
                                      "merge.sorted-log.recursive"})
        self.assertEqual(SETUP["merge.sorted-log.recursive"], "text")
        self.assertIn("[ -f utils/merge/sorted_log.py ] && command -v python3",
                      SETUP["merge.sorted-log.driver"])

    def test_driver_without_python3_falls_back_to_diff3_markers(self):
        bindir = self.repo.parent / (self.repo.name + "-bin")
        bindir.mkdir()
        self.addCleanup(shutil.rmtree, bindir)
        for tool in ("git", "sh", "["):
            found = shutil.which(tool)
            if found:
                os.symlink(found, bindir / tool)
        self.branch("one", log(C, B, A))
        self.branch("two", log(D, B, A))
        self.git("checkout", "-q", "one")
        result = self.git("merge", "--no-edit", "two", check=False, path=str(bindir))
        self.assertNotEqual(result.returncode, 0)
        text = self.done.read_text()
        for expected in ("<<<<<<< ours", "||||||| base", ">>>>>>> theirs",
                         "## 2026-11-01 12:00 — C", "## 2026-11-01 13:00 — D"):
            self.assertIn(expected, text)

    def test_merge_from_subdirectory_uses_driver(self):
        self.branch("one", log(C, B, A))
        self.branch("two", log(D, B, A))
        self.git("checkout", "-q", "one")
        result = self.git("-C", "docs", "merge", "--no-edit", "two", check=False)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(self.done.read_text(), log(D, C, B, A))

    def test_ours_without_script_falls_back_to_diff3_markers(self):
        self.git("checkout", "-q", "-b", "old", "main")
        self.git("rm", "-q", "utils/merge/sorted_log.py")
        self.done.write_text(log(C, B, A))
        self.git("commit", "-q", "-am", "old branch without the driver")
        self.branch("two", log(D, B, A))
        self.git("checkout", "-q", "old")
        result = self.git("merge", "--no-edit", "two", check=False)
        self.assertNotEqual(result.returncode, 0)
        text = self.done.read_text()
        for expected in ("<<<<<<< ours", "||||||| base", "=======", ">>>>>>> theirs",
                         "## 2026-11-01 12:00 — C", "## 2026-11-01 13:00 — D"):
            self.assertIn(expected, text)
        self.assertIn("UU docs/DONE.md", self.git("status", "--porcelain").stdout)

    def test_without_driver_the_same_merge_conflicts(self):
        (self.repo / ".gitattributes").unlink()
        self.git("commit", "-q", "-am", "no driver")
        self.branch("one", log(C, B, A))
        self.git("checkout", "-q", "main")
        self.branch("two", log(D, B, A))
        self.git("checkout", "-q", "one")
        result = self.git("merge", "--no-edit", "two", check=False)
        self.assertNotEqual(result.returncode, 0)

    def test_real_conflict_is_reported(self):
        self.branch("one", log(entry("2026-11-01 11:00", "B", "One."), A))
        self.branch("two", log(entry("2026-11-01 11:00", "B", "Two."), A))
        self.git("checkout", "-q", "one")
        result = self.git("merge", "--no-edit", "two", check=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("<<<<<<< ours", self.done.read_text())
        self.assertIn("UU docs/DONE.md", self.git("status", "--porcelain").stdout)


if __name__ == "__main__":
    unittest.main()
