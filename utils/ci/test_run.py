"""Offline E0-CI fixtures; all Git writes and child test discovery are isolated."""

from contextlib import redirect_stderr, redirect_stdout
import io
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

from . import run as ci


class AssuranceRuntimeTests(unittest.TestCase):
    @unittest.skipUnless(shutil.which("node"), "Node is required for actual reporter fixtures")
    def test_actual_node_rejects_empty_and_skipped_files_accepts_declared_test(self):
        with tempfile.TemporaryDirectory(prefix="gefly-declared-tests-") as directory:
            root = Path(directory)
            (root / "utils/assure/src").mkdir(parents=True)
            (root / "utils/ci").mkdir(parents=True)
            (root / "utils/assure/src/cli.ts").write_text("// No-op checker fixture.\n")
            shutil.copyfile(ci.ROOT / "utils/ci/assurance-reporter.mjs",
                            root / "utils/ci/assurance-reporter.mjs")
            test_file = root / "utils/assure/src/fixture.test.ts"
            with patch.object(ci, "ROOT", root), redirect_stdout(io.StringIO()), \
                    redirect_stderr(io.StringIO()):
                test_file.write_text("// Intentionally declares no tests.\n")
                self.assertFalse(ci.run_assurance(15, tests_only=True))
                test_file.write_text("import {test} from 'node:test'; test('declared',()=>{});\n")
                self.assertTrue(ci.run_assurance(15, tests_only=True))
                (root / "utils/assure/src/empty.test.ts").write_text("// Empty alongside a real test.\n")
                self.assertFalse(ci.run_assurance(15, tests_only=True))
                (root / "utils/assure/src/empty.test.ts").unlink()
                test_file.write_text("import {test} from 'node:test'; "
                                     "test('skipped',{skip:true},()=>{});\n")
                self.assertFalse(ci.run_assurance(15, tests_only=True))


def process_exited(pid):
    """A zombie has exited even when a container's PID 1 has not reaped it."""
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return True
    if sys.platform == "linux":
        try:
            # comm may contain spaces or parentheses; state follows its final ')'.
            stat = Path(f"/proc/{pid}/stat").read_text()
            return stat.rsplit(")", 1)[1].split()[0] == "Z"
        except FileNotFoundError:
            return True
        except (OSError, IndexError):
            pass  # Unknown state is not evidence that the process exited.
    return False


@unittest.skipUnless(sys.platform == "linux", "requires Linux process states")
class ProcessStateTests(unittest.TestCase):
    def test_live_child_is_live_and_unreaped_child_has_exited(self):
        child = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(60)"])
        try:
            self.assertFalse(process_exited(child.pid))
            child.terminate()
            deadline = time.monotonic() + 5
            while time.monotonic() < deadline and not process_exited(child.pid):
                time.sleep(0.01)
            # Do not poll/wait yet: observe termination before the parent reaps it.
            self.assertTrue(process_exited(child.pid))
        finally:
            if not process_exited(child.pid):
                child.kill()
            child.wait(timeout=5)
        self.assertTrue(process_exited(child.pid))


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
        self.runner = self.root / "utils/ci/run.py"
        shutil.copyfile(Path(ci.__file__), self.write("utils/ci/run.py", ""))
        self.write("utils/ci/__init__.py", "")
        self.write("utils/ci/check.py", "from pathlib import Path\n"
                   "assert Path.cwd() == Path(__file__).resolve().parents[2]\n"
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
                                    "        print('fixture study test executed')\n")
        self.write("studies/e2-c172s/test_mass.py", "import unittest\n"
                   "class MassTest(unittest.TestCase):\n"
                   "    def test_offline(self):\n"
                   "        print('fixture mass study executed')\n")
        self.write("studies/e1-browser/render/check-synthetic.mjs",
                   "console.log('fixture render check');\n")
        self.write("utils/assure/src/cli.ts", "// Isolated assurance entry fixture.\n")
        self.write("utils/assure/src/gate.test.ts", "// Isolated assurance test fixture.\n")
        self.write("packages/training/gate.test.ts", "// Isolated training test fixture.\n")
        self.write("utils/ci/assurance-reporter.mjs", "// Isolated reporter fixture.\n")
        self.commit()
        # Controlled PATH: Git only, plus a fake node when a test installs one.
        self.bin = self.outside.parent / "bin"
        self.bin.mkdir()
        os.symlink(self.git_executable, self.bin / "git")

    def install_fake_node(self, exit_code=0, version_exit=0, sleep_s=0,
                          assurance_exit=0, node_version="v26.0.0-fixture", test_skip=0,
                          training_exit=0):
        implementation = self.outside.parent / "fake_node.py"
        implementation.write_text(
            "import os, sys, time, json\n"
            "if sys.argv[1:] == ['--version']:\n"
            f"    print({node_version!r})\n"
            f"    raise SystemExit({version_exit})\n"
            "leaked = sorted(k for k in os.environ if k.upper().startswith('NODE_'))\n"
            "print('fake node ran', sys.argv[1], 'node env:', leaked or 'none', flush=True)\n"
            "if '--test' in sys.argv:\n"
            "    files = [p for p in sys.argv if p.endswith('.test.ts')]\n"
            f"    counts = dict(tests=1, passed={1-test_skip}, failed=0, cancelled=0, skipped={test_skip}, todo=0)\n"
            "    for path in files:\n"
            "        print('GEFLY-ASSURE-RESULT ' + json.dumps(dict(file=path, success=True, counts=counts)))\n"
            "    total = {k: v * len(files) for k, v in counts.items()}\n"
            "    print('GEFLY-ASSURE-RESULT ' + json.dumps(dict(file=None, success=True, counts=total)))\n"
            f"    if {training_exit} and any('/packages/training/' in p.replace(os.sep, '/') for p in files):\n"
            f"        raise SystemExit({training_exit})\n"
            "if sys.argv[-1:] == ['check']:\n"
            f"    raise SystemExit({assurance_exit})\n"
            f"time.sleep({sleep_s})\n"
            f"raise SystemExit({exit_code})\n", encoding="utf-8")
        node = self.bin / "node"
        node.write_text("#!/bin/sh\nexec " + shlex.quote(sys.executable) + " "
                        + shlex.quote(str(implementation)) + ' "$@"\n', encoding="utf-8")
        node.chmod(0o755)

    def write_study(self, body):
        self.write("studies/e1-jsbsim/test_study.py",
                   "import unittest\nclass StudyTest(unittest.TestCase):\n" + body)
        self.commit()

    def test_mass_study_failure_fails_shared_gate(self):
        self.install_fake_node()
        self.write("studies/e2-c172s/test_mass.py", "import unittest\n"
                   "class MassTest(unittest.TestCase):\n"
                   "    def test_invalid_mass(self):\n"
                   "        self.fail('mass study failure fixture')\n")
        result = self.run_gate()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Study tests (studies/e2-c172s)", result.stdout)
        self.assertIn("mass study failure fixture", result.stderr)

    def test_training_failure_fails_shared_gate_after_assurance_passes(self):
        self.install_fake_node(training_exit=1)
        result = self.run_gate()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Assurance integrity: passed", result.stdout)
        self.assertIn("Assessment airspeed tests failed", result.stderr)

    def test_missing_training_suite_fails_shared_gate(self):
        self.install_fake_node()
        (self.root / "packages/training/gate.test.ts").unlink()
        self.commit()
        result = self.run_gate()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Assessment airspeed entry point or test suite is missing", result.stderr)

    def run_gate(self, *arguments, extra_environment=None):
        environment = dict(os.environ, PATH=str(self.bin), **(extra_environment or {}))
        return subprocess.run([sys.executable, str(self.runner), *arguments],
                              cwd=self.outside, capture_output=True, text=True,
                              timeout=60, env=environment)

    def test_absolute_entrypoint_runs_all_gates_from_unrelated_directory(self):
        self.install_fake_node()
        result = self.run_gate()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("fixture scaffold executed", result.stdout)
        self.assertIn("fixture tool test executed", result.stdout)
        self.assertIn("fixture study test executed", result.stdout + result.stderr)
        self.assertIn("fake node ran", result.stdout)
        self.assertIn("check-synthetic.mjs", result.stdout)
        self.assertIn("Synthetic render check: passed.", result.stdout)
        self.assertIn("Foundation CI: passed.", result.stdout)

    def test_study_skip_is_counted_and_reaches_final_line(self):
        self.install_fake_node()
        self.write_study("    def test_offline(self):\n        pass\n"
                         "    @unittest.skip('fixture optional engine absent')\n"
                         "    def test_engine(self):\n"
                         "        self.fail('skipped test must not run')\n")
        result = self.run_gate()
        output = result.stdout + result.stderr
        self.assertEqual(result.returncode, 0, output)
        self.assertIn("1 executed, 1 skipped", output)
        self.assertIn("fixture optional engine absent", output)
        self.assertNotIn("skipped test must not run", output)
        self.assertNotIn("Foundation CI: passed.", result.stdout)
        self.assertIn("Foundation CI: passed with skipped checks "
                      "(study studies/e1-jsbsim: 1 of 2 skipped).", result.stdout)

    def test_all_skipped_study_is_skip_not_pass(self):
        self.install_fake_node()
        self.write_study("    @unittest.skip('fixture optional engine absent')\n"
                         "    def test_engine(self):\n        pass\n")
        result = self.run_gate()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("all were skipped (not a pass)", result.stdout)
        self.assertIn("study studies/e1-jsbsim: all 1 skipped, none executed",
                      result.stdout.splitlines()[-1])
        self.assertNotIn("Foundation CI: passed.", result.stdout)

    def test_study_timeout_is_failure(self):
        self.install_fake_node()
        self.write_study("    def test_hang(self):\n"
                         "        import time; time.sleep(60)\n")
        result = self.run_gate("--timeout", "5")
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("Study tests (studies/e1-jsbsim) timed out", result.stderr)
        self.assertIn("Foundation CI: FAILED.", result.stdout)

    @unittest.skipUnless(os.name == "posix", "process-group cleanup is POSIX-only")
    def test_timeout_kills_grandchild_holding_output_pipe(self):
        self.install_fake_node()
        pid_file = self.outside.parent / "grandchild.pid"
        for body in ("        time.sleep(60)\n", "        pass\n"):
            with self.subTest(child_waits=body.strip() != "pass"):
                pid_file.unlink(missing_ok=True)
                # The grandchild inherits the captured study stdout and outlives the test.
                self.write_study(
                    "    def test_spawn(self):\n"
                    "        import subprocess, sys, time\n"
                    "        child = subprocess.Popen([sys.executable, '-c', "
                    "'import time; time.sleep(120)'])\n"
                    f"        open({str(pid_file)!r}, 'w').write(str(child.pid))\n" + body)
                output_path = self.outside.parent / "gate.out"
                with open(output_path, "w", encoding="utf-8") as output:
                    started = time.monotonic()
                    gate = subprocess.Popen(
                        [sys.executable, str(self.runner), "--timeout", "4"],
                        cwd=self.outside, stdout=output, stderr=subprocess.STDOUT,
                        env=dict(os.environ, PATH=str(self.bin)))
                    try:
                        code = gate.wait(timeout=40)
                    finally:
                        if gate.poll() is None:
                            gate.kill()
                            gate.wait()
                    elapsed = time.monotonic() - started
                text = output_path.read_text(encoding="utf-8")
                self.assertNotEqual(code, 0, text)
                self.assertLess(elapsed, 30, text)
                self.assertIn("Study tests (studies/e1-jsbsim) timed out", text)
                self.assertIn("Foundation CI: FAILED.", text)
                grandchild = int(pid_file.read_text(encoding="utf-8"))
                deadline = time.monotonic() + 5
                while time.monotonic() < deadline:
                    if process_exited(grandchild):
                        break
                    time.sleep(0.05)
                else:
                    os.kill(grandchild, 9)
                    self.fail(f"grandchild {grandchild} survived the timeout")

    def test_render_timeout_is_failure(self):
        self.install_fake_node(sleep_s=60)
        result = self.run_gate("--timeout", "5")
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("Synthetic render check timed out", result.stderr)
        self.assertIn("Foundation CI: FAILED.", result.stdout)

    def test_inherited_node_options_are_not_passed_to_node(self):
        self.install_fake_node()
        result = self.run_gate(extra_environment={
            "NODE_OPTIONS": "--require /nonexistent/hook.js",
            "NODE_PATH": str(self.outside), "node_debug": "fixture"})
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("node env: none", result.stdout)

    def test_failing_node_version_is_not_success(self):
        self.install_fake_node(version_exit=3)
        result = self.run_gate()
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("node --version failed (exit 3)", result.stderr)
        self.assertNotIn("fake node ran", result.stdout)

    def test_failing_study_test_is_not_success(self):
        self.install_fake_node()
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
        self.install_fake_node()
        self.write("studies/e1-jsbsim/test_study.py", "import fixture_missing_module\n")
        self.commit()
        result = self.run_gate()
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("fixture_missing_module", result.stdout + result.stderr)

    def test_missing_or_empty_study_suite_is_not_success(self):
        self.install_fake_node()
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
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("Synthetic render check: skipped: node not found", result.stdout)
        self.assertNotIn("Synthetic render check: passed", result.stdout)
        self.assertNotIn("Foundation CI: passed.", result.stdout)
        self.assertIn("Assurance requires Node", result.stderr)
        self.assertIn("Foundation CI: FAILED.", result.stdout)

    def test_assurance_integrity_failure_is_not_a_pass(self):
        self.install_fake_node(assurance_exit=1)
        result = self.run_gate()
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("Synthetic render check: passed.", result.stdout)
        self.assertIn("Assurance integrity failed", result.stderr)

    def test_missing_assurance_entry_or_tests_is_not_a_pass(self):
        self.install_fake_node()
        (self.root / "utils/assure/src/cli.ts").unlink()
        result = self.run_gate()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Assurance entry point or test suite is missing", result.stderr)

    def test_old_node_cannot_silently_skip_assurance(self):
        self.install_fake_node(node_version="v22.0.0")
        result = self.run_gate()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Assurance requires Node 24.2", result.stderr)

    def test_skipped_assurance_test_is_not_acceptance(self):
        self.install_fake_node(test_skip=1)
        result = self.run_gate()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Assurance tests failed, skipped", result.stderr)

    def test_missing_node_fails_when_required(self):
        result = self.run_gate("--require-node")
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("node not found", result.stderr)
        self.assertIn("Foundation CI: FAILED.", result.stdout)

    def test_failing_render_check_is_not_success(self):
        self.install_fake_node(exit_code=1)
        result = self.run_gate()
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("Synthetic render check failed (exit 1)", result.stderr)
        self.assertIn("Foundation CI: FAILED.", result.stdout)

    def test_missing_render_script_is_not_success(self):
        self.install_fake_node()
        (self.root / "studies/e1-browser/render/check-synthetic.mjs").unlink()
        result = self.run_gate()
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("synthetic render check is missing", result.stderr)

    def test_scaffold_child_failure_is_not_success(self):
        self.write("utils/ci/check.py", "raise SystemExit('fixture scaffold rejected')\n")
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


class StudyCountMarkerTests(unittest.TestCase):
    def test_valid_marker_is_parsed(self):
        output = f"noise\n{ci.STUDY_RESULT_MARKER} " \
                 '{"discovered": 3, "executed": 2, "skipped": 1}\n'
        self.assertEqual(ci.parse_study_counts(output),
                         {"discovered": 3, "executed": 2, "skipped": 1})

    def test_missing_or_inconsistent_marker_is_rejected(self):
        marker = ci.STUDY_RESULT_MARKER
        for output in ("", "no marker\n", f"{marker} not json\n",
                       f'{marker} {{"discovered": 3, "executed": 3, "skipped": 1}}\n',
                       f'{marker} {{"discovered": 1, "executed": true, "skipped": 0}}\n',
                       f'{marker} {{"discovered": 1, "executed": 2, "skipped": -1}}\n'):
            with self.subTest(output=output):
                self.assertIsNone(ci.parse_study_counts(output))


if __name__ == "__main__":
    unittest.main()
