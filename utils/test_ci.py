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
        # Git environment variables override cwd and can redirect writes outside the fixture.
        self.git_environment = {name: value for name, value in os.environ.items()
                                if not name.upper().startswith("GIT_")}
        self.git_environment.update({"GIT_CONFIG_NOSYSTEM": "1",
                                     "GIT_CONFIG_GLOBAL": os.devnull,
                                     "GIT_TERMINAL_PROMPT": "0"})
        environment = patch.dict(os.environ, self.git_environment, clear=True)
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


class GitEnvironmentIsolationTests(unittest.TestCase):
    def test_inherited_git_redirection_cannot_mutate_other_repository(self):
        directory = tempfile.TemporaryDirectory(prefix="gefly-foreign-git-test-")
        self.addCleanup(directory.cleanup)
        foreign = Path(directory.name) / "foreign"
        foreign.mkdir()
        clean_environment = {name: value for name, value in os.environ.items()
                             if not name.upper().startswith("GIT_")}
        clean_environment.update({"GIT_CONFIG_NOSYSTEM": "1",
                                  "GIT_CONFIG_GLOBAL": os.devnull,
                                  "GIT_TERMINAL_PROMPT": "0"})
        git_executable = shutil.which("git")
        self.assertIsNotNone(git_executable, "Git is required for offline CI fixtures")

        def foreign_git(*arguments):
            return subprocess.run([git_executable, *arguments], cwd=foreign,
                                  env=clean_environment, capture_output=True,
                                  text=True, check=True).stdout

        foreign_git("init", "--quiet")
        foreign_git("config", "user.name", "External fixture owner")
        foreign_git("config", "user.email", "external@example.invalid")
        foreign_git("config", "commit.gpgsign", "false")
        (foreign / "sentinel.txt").write_text("Keep this repository unchanged.\n", encoding="utf-8")
        foreign_git("add", "--", "sentinel.txt")
        foreign_git("commit", "--quiet", "-m", "External repository baseline")
        original_head = foreign_git("rev-parse", "HEAD")
        protected_paths = [foreign / ".git/index", foreign / ".git/config",
                           foreign / "sentinel.txt"]
        original_bytes = {path: path.read_bytes() for path in protected_paths}
        redirected_environment = {
            "GIT_DIR": str(foreign / ".git"),
            "GIT_WORK_TREE": str(foreign),
            "GIT_INDEX_FILE": str(foreign / ".git/index"),
            "GIT_COMMON_DIR": str(foreign / ".git"),
            "GIT_OBJECT_DIRECTORY": str(foreign / ".git/objects"),
            "GIT_CONFIG_COUNT": "1",
            "GIT_CONFIG_KEY_0": "user.name",
            "GIT_CONFIG_VALUE_0": "Injected caller configuration",
        }
        for inherited in ({"GIT_DIR": str(foreign / ".git")}, redirected_environment):
            with self.subTest(variables=sorted(inherited)):
                fixture = GitFixture("runTest")
                with patch.dict(os.environ, inherited):
                    try:
                        fixture.setUp()
                        fixture_top = Path(fixture.git("rev-parse", "--show-toplevel").stdout.strip())
                        fixture_files = fixture.git("ls-files").stdout
                        fixture_head = fixture.git("rev-parse", "HEAD").stdout
                        expected_top = fixture.root.resolve()
                    finally:
                        fixture.doCleanups()

                self.assertEqual(foreign_git("rev-parse", "HEAD"), original_head)
                for path, original in original_bytes.items():
                    self.assertEqual(path.read_bytes(), original, str(path))
                self.assertEqual(foreign_git("ls-files"), "sentinel.txt\n")
                self.assertEqual(fixture_top.resolve(), expected_top)
                self.assertEqual(fixture_files, "clean.txt\n")
                self.assertTrue(fixture_head.strip())


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

    def test_inherited_git_directory_or_index_cannot_hide_tracked_defect(self):
        self.write("README.md", "Clean overlapping file.\n")
        self.write("bad.txt", "Tracked whitespace defect. \n")
        self.commit()
        foreign = self.outside / "foreign"
        foreign.mkdir()

        def foreign_git(*arguments):
            return subprocess.run([self.git_executable, *arguments], cwd=foreign,
                                  capture_output=True, text=True, check=True)

        foreign_git("init", "--quiet")
        foreign_git("config", "user.name", "External fixture owner")
        foreign_git("config", "user.email", "external@example.invalid")
        foreign_git("config", "commit.gpgsign", "false")
        (foreign / "README.md").write_text("Clean overlapping file.\n", encoding="utf-8")
        foreign_git("add", "--", "README.md")
        foreign_git("commit", "--quiet", "-m", "External clean index")
        for variable, target in (("GIT_DIR", foreign / ".git"),
                                 ("GIT_INDEX_FILE", foreign / ".git/index")):
            with self.subTest(variable=variable):
                with patch.dict(os.environ, {variable: str(target)}):
                    code, diagnostics = self.whitespace()
                self.assertNotEqual(code, 0, diagnostics)
                self.assertIn("bad.txt", diagnostics)


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
        self.study_path = self.write("studies/e1-jsbsim/test_study.py", "import unittest\n"
                                    "class StudyTest(unittest.TestCase):\n"
                                    "    def test_offline(self):\n"
                                    "        print('fixture study test executed')\n"
                                    "    @unittest.skip('fixture optional engine absent')\n"
                                    "    def test_engine(self):\n"
                                    "        self.fail('skipped test must not run')\n")
        self.write("studies/e1-browser/render/check-synthetic.mjs",
                   "console.log('fixture render check');\n")
        self.commit()
        # Controlled PATH: Git only, plus a fake node when a test installs one.
        self.bin = self.outside.parent / "bin"
        self.bin.mkdir()
        os.symlink(self.git_executable, self.bin / "git")

    def install_fake_node(self, exit_code):
        node = self.bin / "node"
        node.write_text(f"#!{sys.executable}\n"
                        "import sys\n"
                        "if sys.argv[1:] == ['--version']:\n"
                        "    print('v0.0.0-fixture'); raise SystemExit(0)\n"
                        "print('fake node ran', sys.argv[1])\n"
                        f"raise SystemExit({exit_code})\n", encoding="utf-8")
        node.chmod(0o755)

    def run_gate(self, *arguments):
        environment = dict(os.environ, PATH=str(self.bin))
        return subprocess.run([sys.executable, str(self.runner), *arguments],
                              cwd=self.outside, capture_output=True, text=True,
                              timeout=60, env=environment)

    def test_absolute_entrypoint_runs_all_gates_from_unrelated_directory(self):
        self.install_fake_node(0)
        result = self.run_gate()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("fixture scaffold executed", result.stdout)
        self.assertIn("fixture tool test executed", result.stdout)
        self.assertIn("fixture study test executed", result.stdout + result.stderr)
        self.assertIn("fake node ran", result.stdout)
        self.assertIn("check-synthetic.mjs", result.stdout)
        self.assertIn("Synthetic render check: passed.", result.stdout)
        self.assertIn("Foundation CI: passed.", result.stdout)

    def test_study_skip_is_counted_and_not_executed(self):
        self.install_fake_node(0)
        result = self.run_gate()
        output = result.stdout + result.stderr
        self.assertEqual(result.returncode, 0, output)
        self.assertIn("1 executed, 1 skipped", output)
        self.assertIn("fixture optional engine absent", output)
        self.assertNotIn("skipped test must not run", output)

    def test_failing_study_test_is_not_success(self):
        self.install_fake_node(0)
        self.write("studies/e1-jsbsim/test_study.py", "import unittest\n"
                   "class StudyTest(unittest.TestCase):\n"
                   "    def test_failure(self):\n"
                   "        self.fail('fixture study failure')\n")
        self.commit()
        result = self.run_gate()
        output = result.stdout + result.stderr
        self.assertNotEqual(result.returncode, 0, output)
        self.assertIn("fixture study failure", output)
        self.assertIn("Foundation CI: FAILED.", output)

    def test_study_import_error_is_not_success(self):
        self.install_fake_node(0)
        self.write("studies/e1-jsbsim/test_study.py", "import fixture_missing_module\n")
        self.commit()
        result = self.run_gate()
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("fixture_missing_module", result.stdout + result.stderr)

    def test_missing_or_empty_study_suite_is_not_success(self):
        self.install_fake_node(0)
        self.study_path.unlink()
        self.commit()
        result = self.run_gate()
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("study tests", (result.stdout + result.stderr).lower())
        shutil.rmtree(self.root / "studies/e1-jsbsim")
        result = self.run_gate()
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("missing", result.stdout + result.stderr)

    def test_missing_node_is_reported_skip_not_pass(self):
        result = self.run_gate()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("Synthetic render check: skipped: node not found", result.stdout)
        self.assertNotIn("Synthetic render check: passed", result.stdout)
        self.assertNotIn("Foundation CI: passed.", result.stdout)
        self.assertIn("Foundation CI: passed with skipped check", result.stdout)

    def test_missing_node_fails_when_required(self):
        result = self.run_gate("--require-node")
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("node not found", result.stderr)
        self.assertIn("Foundation CI: FAILED.", result.stdout)

    def test_failing_render_check_is_not_success(self):
        self.install_fake_node(1)
        result = self.run_gate()
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("Synthetic render check failed (exit 1)", result.stderr)
        self.assertIn("Foundation CI: FAILED.", result.stdout)

    def test_missing_render_script_is_not_success(self):
        self.install_fake_node(0)
        (self.root / "studies/e1-browser/render/check-synthetic.mjs").unlink()
        result = self.run_gate()
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("synthetic render check is missing", result.stderr)

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
