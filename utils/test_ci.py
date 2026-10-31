"""Offline E0-CI fixtures; all Git writes and child test discovery are isolated."""

from contextlib import redirect_stderr, redirect_stdout
import io
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import ci


class GitFixture(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory(prefix="gefly-ci-test-")
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name) / "repo"
        self.root.mkdir()
        self.outside = Path(directory.name) / "unrelated"
        self.outside.mkdir()
        self.git_executable = shutil.which("git")
        self.assertIsNotNone(self.git_executable, "Git is required for offline CI fixtures")
        self.git_environment = {"GIT_CONFIG_NOSYSTEM": "1",
                                "GIT_CONFIG_GLOBAL": os.devnull,
                                "GIT_TERMINAL_PROMPT": "0"}
        environment = patch.dict(os.environ, self.git_environment)
        environment.start()
        self.addCleanup(environment.stop)
        self.git("init", "--quiet")
        self.git("config", "user.name", "Gefly test fixture")
        self.git("config", "user.email", "fixture@example.invalid")
        self.git("config", "core.autocrlf", "false")
        self.git("config", "commit.gpgsign", "false")
        self.write("clean.txt", "Clean tracked content.\n")
        self.commit()

    def write(self, relative, content):
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content if isinstance(content, bytes) else content.encode("utf-8"))
        return path

    def git(self, *arguments):
        return subprocess.run([self.git_executable, *arguments], cwd=self.root,
                              capture_output=True, text=True, check=True)

    def commit(self):
        self.git("add", "--all")
        self.git("commit", "--quiet", "-m", "Offline fixture")

    def whitespace(self):
        stdout, stderr = io.StringIO(), io.StringIO()
        with redirect_stdout(stdout), redirect_stderr(stderr):
            code = ci.check_whitespace(self.root)
        return code, stdout.getvalue() + stderr.getvalue()


class WhitespaceTests(GitFixture):
    def test_clean_committed_content_passes(self):
        code, diagnostics = self.whitespace()
        self.assertEqual(code, 0, diagnostics)

    def test_spaces_in_tracked_filename_pass(self):
        self.write("docs/a filename with spaces.md", "# Clean content\n")
        self.commit()
        code, diagnostics = self.whitespace()
        self.assertEqual(code, 0, diagnostics)

    def test_crlf_preservation_attribute_passes(self):
        self.write(".gitattributes", "preserved.txt -text "
                   "whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol\n")
        self.write("preserved.txt", b"Original line endings.\r\nSecond line.\r\n")
        self.commit()
        self.assertIn(b"\r\n", (self.root / "preserved.txt").read_bytes())
        code, diagnostics = self.whitespace()
        self.assertEqual(code, 0, diagnostics)

    def test_staged_trailing_whitespace_fails(self):
        self.write("new file.txt", "Trailing whitespace.  \n")
        self.git("add", "--", "new file.txt")
        code, diagnostics = self.whitespace()
        self.assertNotEqual(code, 0, diagnostics)
        self.assertIn("new file.txt", diagnostics)

    def test_clean_committed_whitespace_fails_despite_empty_diff(self):
        self.write("clean.txt", "Committed trailing whitespace. \n")
        self.commit()
        self.assertEqual(self.git("status", "--porcelain").stdout, "")
        self.assertEqual(self.git("diff", "--check").returncode, 0)
        code, diagnostics = self.whitespace()
        self.assertNotEqual(code, 0, diagnostics)
        self.assertIn("clean.txt", diagnostics)

    def test_missing_tracked_working_file_fails(self):
        (self.root / "clean.txt").unlink()
        code, diagnostics = self.whitespace()
        self.assertNotEqual(code, 0, diagnostics)
        self.assertIn("clean.txt", diagnostics)

    def test_missing_git_fails(self):
        with patch.dict(os.environ, {"PATH": str(self.outside)}):
            code, diagnostics = self.whitespace()
        self.assertNotEqual(code, 0, diagnostics)
        self.assertIn("git", diagnostics.lower())

    def test_non_repository_git_error_fails(self):
        with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
            code = ci.check_whitespace(self.outside)
        self.assertNotEqual(code, 0)


class CiEntrypointTests(GitFixture):
    def setUp(self):
        super().setUp()
        self.runner = self.root / "utils/ci.py"
        shutil.copyfile(Path(ci.__file__), self.write("utils/ci.py", ""))
        self.write("utils/check.py", "from pathlib import Path\n"
                   "assert Path.cwd() == Path(__file__).resolve().parent.parent\n"
                   "print('fixture scaffold executed')\n")
        self.test_path = self.write("utils/test_gate.py", "from pathlib import Path\n"
                                   "import unittest\n"
                                   "class FixtureTest(unittest.TestCase):\n"
                                   "    def test_offline(self):\n"
                                   "        self.assertEqual(Path.cwd(), "
                                   "Path(__file__).resolve().parent.parent)\n"
                                   "        print('fixture tool test executed')\n")
        self.commit()

    def run_gate(self, *arguments):
        return subprocess.run([sys.executable, str(self.runner), *arguments],
                              cwd=self.outside, capture_output=True, text=True,
                              timeout=30)

    def test_absolute_entrypoint_runs_all_gates_from_unrelated_directory(self):
        result = self.run_gate()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("fixture scaffold executed", result.stdout)
        self.assertIn("fixture tool test executed", result.stdout)

    def test_scaffold_child_failure_is_not_success(self):
        self.write("utils/check.py", "raise SystemExit('fixture scaffold rejected')\n")
        result = self.run_gate()
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("fixture scaffold rejected", result.stdout + result.stderr)

    def test_failing_test_is_not_success(self):
        self.write("utils/test_gate.py", "import unittest\n"
                   "class FixtureTest(unittest.TestCase):\n"
                   "    def test_failure(self):\n"
                   "        self.fail('fixture deliberate failure')\n")
        result = self.run_gate()
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("fixture deliberate failure", result.stdout + result.stderr)

    def test_empty_suite_is_not_success(self):
        self.test_path.unlink()
        self.commit()
        result = self.run_gate()
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("test", (result.stdout + result.stderr).lower())

    def test_full_gate_rejects_whitespace_in_clean_checkout(self):
        self.write("clean.txt", "Committed whitespace defect. \n")
        self.commit()
        self.assertEqual(self.git("status", "--porcelain").stdout, "")
        result = self.run_gate()
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("fixture scaffold executed", result.stdout)
        self.assertIn("fixture tool test executed", result.stdout)
        self.assertIn("clean.txt", result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
