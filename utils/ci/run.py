#!/usr/bin/env python3
"""Run the offline repository-tool gates from any caller directory (R-BOOT-3)."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import sys
import time
import unittest


ROOT = Path(__file__).resolve().parents[2]
GIT_TIMEOUT_S = 60.0
DEFAULT_PHASE_TIMEOUT_S = 600.0
STUDY_RESULT_MARKER = "GEFLY-STUDY-RESULT"
KILL_GRACE_S = 2.0
POSIX = os.name == "posix"


def git_environment() -> dict[str, str]:
    """Keep normal process settings while preventing inherited Git redirection."""
    return {key: value for key, value in os.environ.items()
            if not key.upper().startswith("GIT_")}


def check_whitespace(root: Path) -> int:
    """Inspect all tracked working files, including files with no Git diff.

    Untracked files are outside this check until added to Git. Git attributes
    remain authoritative for explicit exceptions such as preserved license CRLF.
    """
    root = root.resolve()
    environment = git_environment()
    try:
        listing = subprocess.run(
            ["git", "ls-files", "-z"], cwd=root, capture_output=True, check=False,
            env=environment, timeout=GIT_TIMEOUT_S,
        )
    except subprocess.TimeoutExpired:
        print(f"ERROR: Git timed out listing tracked files ({GIT_TIMEOUT_S:g} s).",
              file=sys.stderr)
        return 1
    except OSError as error:
        print(f"ERROR: cannot list tracked files: {error}", file=sys.stderr)
        return 1
    if listing.returncode != 0:
        print("ERROR: Git failed to list tracked files.", file=sys.stderr)
        print(listing.stderr.decode("utf-8", errors="replace"), file=sys.stderr, end="")
        return 1
    paths = [os.fsdecode(item) for item in listing.stdout.split(b"\0") if item]
    if not paths:
        print("ERROR: no tracked files; whitespace coverage would be empty.", file=sys.stderr)
        return 1
    failed = False
    for relative in paths:
        path = root / relative
        if not (path.is_file() or path.is_symlink()):
            print(f"ERROR: tracked path is missing or is not a file: {relative!r}",
                  file=sys.stderr)
            failed = True
            continue
        try:
            result = subprocess.run(
                ["git", "--no-pager", "-c",
                 "core.whitespace=blank-at-eol,blank-at-eof,space-before-tab",
                 "diff", "--no-ext-diff", "--no-textconv", "--no-index", "--check",
                 "--", os.devnull, str(path)],
                cwd=root, capture_output=True, text=True, encoding="utf-8",
                errors="replace", check=False, env=environment, timeout=GIT_TIMEOUT_S,
            )
        except subprocess.TimeoutExpired:
            print(f"ERROR: whitespace check timed out for {relative!r} "
                  f"({GIT_TIMEOUT_S:g} s).", file=sys.stderr)
            return 1
        except OSError as error:
            print(f"ERROR: cannot check whitespace for {relative!r}: {error}",
                  file=sys.stderr)
            return 1
        # --no-index returns 1 for a content difference without whitespace errors.
        # --check adds a failure bit for whitespace defects; tool errors also fail.
        if result.returncode not in (0, 1):
            print(f"ERROR: whitespace check failed for {relative!r} "
                  f"(Git exit {result.returncode}).", file=sys.stderr)
            if result.stdout:
                print(result.stdout, file=sys.stderr, end="")
            if result.stderr:
                print(result.stderr, file=sys.stderr, end="")
            failed = True
    print(f"Tracked-content whitespace: {'FAILED' if failed else 'passed'} "
          f"({len(paths)} tracked paths; untracked files excluded).", flush=True)
    return 1 if failed else 0


STUDY_TEST_DIRS = ("studies/e1-jsbsim",)
RENDER_CHECK = "studies/e1-browser/render/check-synthetic.mjs"


def run_tests(start: Path | None = None, label: str = "Offline repository-tool tests",
              report_counts: bool = False) -> int:
    """Discover offline tests under ``start`` and reject an accidentally empty suite.

    Skipped tests are counted and listed with their reasons. With
    ``report_counts`` a final machine-readable marker line carries the counts to
    the parent gate, so a skip is never summarized as an executed pass.
    """
    start = ROOT / "utils" if start is None else start
    if not start.is_dir():
        print(f"ERROR: {label}: test directory is missing: {start}", file=sys.stderr)
        return 1
    try:
        suite = unittest.defaultTestLoader.discover(str(start), pattern="test_*.py",
                                                    top_level_dir=str(start))
    except (ImportError, OSError) as error:
        print(f"ERROR: cannot discover {label.lower()}: {error}", file=sys.stderr)
        return 1
    count = suite.countTestCases()
    if count == 0:
        print(f"ERROR: no {label.lower()} discovered in {start}.", file=sys.stderr)
        return 1
    print(f"{label}: {count} discovered.", flush=True)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    skipped = len(result.skipped)
    executed = result.testsRun - skipped
    print(f"{label}: {executed} executed, {skipped} skipped "
          f"({'passed' if result.wasSuccessful() else 'FAILED'} for executed tests).",
          flush=True)
    for test, reason in result.skipped:
        print(f"  skipped: {test.id()}: {reason}", flush=True)
    if executed == 0 and result.wasSuccessful():
        print(f"{label}: no test executed; all were skipped (not a pass).", flush=True)
    if report_counts:
        counts = {"discovered": count, "executed": executed, "skipped": skipped}
        print(f"{STUDY_RESULT_MARKER} {json.dumps(counts, sort_keys=True)}", flush=True)
    return 0 if result.wasSuccessful() else 1


def parse_study_counts(output: str) -> dict[str, int] | None:
    """Return the last valid count marker from a study child, or None."""
    for line in reversed(output.splitlines()):
        if not line.startswith(STUDY_RESULT_MARKER + " "):
            continue
        try:
            counts = json.loads(line[len(STUDY_RESULT_MARKER) + 1:])
        except ValueError:
            return None
        keys = ("discovered", "executed", "skipped")
        if (isinstance(counts, dict)
                and all(type(counts.get(key)) is int and counts[key] >= 0 for key in keys)
                and counts["executed"] + counts["skipped"] == counts["discovered"]):
            return {key: counts[key] for key in keys}
        return None
    return None


def node_environment() -> dict[str, str]:
    """Drop inherited Node hooks and Git repository/config redirection."""
    return {key: value for key, value in os.environ.items()
            if not key.upper().startswith(("NODE_", "GIT_"))}


def _terminate_tree(process: subprocess.Popen) -> None:
    """Stop a timed-out child and, on POSIX, every process in its session group.

    The child leads its own process group, so grandchildren that keep an output
    pipe open are signalled too: SIGTERM, a short grace period, then SIGKILL.
    Elsewhere only the direct child can be killed.
    """
    if not POSIX:
        process.kill()
        return
    group = process.pid
    try:
        os.killpg(group, signal.SIGTERM)
    except (ProcessLookupError, PermissionError):
        return
    deadline = time.monotonic() + KILL_GRACE_S
    while time.monotonic() < deadline:
        process.poll()  # reap the leader so an exited group can disappear
        try:
            os.killpg(group, 0)
        except (ProcessLookupError, PermissionError):
            return
        time.sleep(0.05)
    try:
        os.killpg(group, signal.SIGKILL)
    except (ProcessLookupError, PermissionError):
        pass


def run_child(command: list[str], timeout_s: float, capture: bool = False,
              env: dict[str, str] | None = None) -> subprocess.CompletedProcess:
    """Run a child with a whole-group timeout; raise TimeoutExpired after cleanup."""
    process = subprocess.Popen(
        command, cwd=ROOT, env=env, stdout=subprocess.PIPE if capture else None,
        text=True, encoding="utf-8", errors="replace", start_new_session=POSIX)
    try:
        output, _ = process.communicate(timeout=timeout_s)
    except BaseException as error:  # timeout, or interruption of the gate itself
        _terminate_tree(process)
        partial = ""
        try:
            partial, _ = process.communicate(timeout=KILL_GRACE_S)
        except subprocess.TimeoutExpired:
            # A process outside the group may still hold the pipe; stop reading.
            if process.stdout is not None:
                process.stdout.close()
            process.kill()
            process.wait()
        if isinstance(error, subprocess.TimeoutExpired):
            raise subprocess.TimeoutExpired(command, timeout_s, output=partial) from None
        raise
    return subprocess.CompletedProcess(command, process.returncode, output, None)


def run_render_check(require_node: bool, timeout_s: float) -> str:
    """Run the offline synthetic-source check with Node; return passed/failed/skipped."""
    script = ROOT / RENDER_CHECK
    if not script.is_file():
        print(f"ERROR: synthetic render check is missing: {RENDER_CHECK}", file=sys.stderr)
        return "failed"
    node = shutil.which("node")
    if node is None:
        if require_node:
            print("ERROR: Synthetic render check: node not found but --require-node "
                  "was given.", file=sys.stderr)
            return "failed"
        print("Synthetic render check: skipped: node not found (not a pass).", flush=True)
        return "skipped"
    environment = node_environment()
    try:
        version = run_child([node, "--version"], timeout_s, capture=True,
                            env=environment)
        if version.returncode != 0:
            print(f"ERROR: node --version failed (exit {version.returncode}); "
                  f"{Path(node).resolve()} is not usable.", file=sys.stderr)
            return "failed"
        print(f"Node: {version.stdout.strip() or 'unknown version'} "
              f"({Path(node).resolve()})", flush=True)
        result = run_child([node, str(script)], timeout_s, env=environment)
    except subprocess.TimeoutExpired:
        print(f"ERROR: Synthetic render check timed out ({timeout_s:g} s).",
              file=sys.stderr)
        return "failed"
    except OSError as error:
        print(f"ERROR: cannot run synthetic render check: {error}", file=sys.stderr)
        return "failed"
    if result.returncode != 0:
        print(f"ERROR: Synthetic render check failed (exit {result.returncode}).",
              file=sys.stderr)
        return "failed"
    print("Synthetic render check: passed.", flush=True)
    return "passed"


def run_assurance(timeout_s: float, tests_only: bool = False) -> bool:
    """Run the required offline assurance suite and integrity checker."""
    node = shutil.which("node")
    if node is None:
        print("ERROR: Assurance requires Node 24.2 or newer; node not found.", file=sys.stderr)
        return False
    entry = ROOT / "utils/assure/src/cli.ts"
    reporter = ROOT / "utils/ci/assurance-reporter.mjs"
    tests = sorted([*(ROOT / "utils/assure/src").glob("*.test.ts"),
                    *(ROOT / "utils/assure/upstream/src").rglob("*.test.ts")])
    if not entry.is_file() or not reporter.is_file() or not tests:
        print("ERROR: Assurance entry point or test suite is missing.", file=sys.stderr)
        return False
    environment = node_environment()
    try:
        version = run_child([node, "--version"], timeout_s, capture=True, env=environment)
        match = re.fullmatch(r"v(\d+)\.(\d+)\.(\d+)(?:[-+].*)?", version.stdout.strip())
        if version.returncode or not match or tuple(map(int, match.groups())) < (24, 2, 0):
            print("ERROR: Assurance requires Node 24.2 or newer; "
                  f"observed {version.stdout.strip()!r} (exit {version.returncode}).",
                  file=sys.stderr)
            return False
        result = run_child([node, "--test", f"--test-reporter={reporter}", *map(str, tests)],
                           timeout_s, capture=True, env=environment)
        print(result.stdout, end="", flush=True)
        summaries = []
        try:
            for line in result.stdout.splitlines():
                if line.startswith("GEFLY-ASSURE-RESULT "):
                    summaries.append(json.loads(line.removeprefix("GEFLY-ASSURE-RESULT ")))
            files = {}
            global_summary = []
            for summary in summaries:
                counts = summary["counts"]
                required = ("tests", "passed", "failed", "cancelled", "skipped", "todo")
                if (summary["success"] is not True or not isinstance(counts, dict)
                        or any(type(counts.get(key)) is not int or counts[key] < 0
                               for key in required)
                        or counts["tests"] == 0 or counts["passed"] != counts["tests"]
                        or any(counts[key] for key in ("failed", "cancelled", "skipped", "todo"))):
                    raise ValueError("nonpassing or incomplete declared-test summary")
                if summary["file"] is None:
                    global_summary.append(counts)
                else:
                    if not isinstance(summary["file"], str):
                        raise ValueError("invalid summary file")
                    path = str(Path(summary["file"]).resolve())
                    if path in files:
                        raise ValueError("duplicate file summary")
                    files[path] = counts
            expected = {str(path.resolve()) for path in tests}
            if (set(files) != expected or len(global_summary) != 1
                    or global_summary[0]["tests"] != sum(c["tests"] for c in files.values())):
                raise ValueError("missing or inconsistent declared-test summaries")
        except (KeyError, TypeError, ValueError, OSError):
            summaries = []
        if result.returncode or not summaries:
            print("ERROR: Assurance tests failed, skipped or produced no complete "
                  "passing declared-test summary for each file.", file=sys.stderr)
            return False
        print(f"Assurance tests: passed ({global_summary[0]['tests']} tests).", flush=True)
        if tests_only:
            return True
        result = run_child([node, str(entry), "check"], timeout_s, env=environment)
        if result.returncode:
            print(f"ERROR: Assurance integrity failed (exit {result.returncode}).",
                  file=sys.stderr)
            return False
        print("Assurance integrity: passed.", flush=True)
        return True
    except (OSError, subprocess.TimeoutExpired) as error:
        print(f"ERROR: Assurance could not complete: {error}", file=sys.stderr)
        return False


def run_phase(name: str, command: list[str], timeout_s: float,
              capture: bool = False) -> tuple[bool, str]:
    """Run one child phase; return (succeeded, captured stdout when requested)."""
    print(f"Running {name}...", flush=True)
    try:
        result = run_child(command, timeout_s, capture=capture)
    except subprocess.TimeoutExpired as error:
        if capture and error.output:
            print(error.output, end="", flush=True)
        print(f"ERROR: {name} timed out ({timeout_s:g} s).", file=sys.stderr)
        return False, ""
    except OSError as error:
        print(f"ERROR: cannot run {name}: {error}", file=sys.stderr)
        return False, ""
    output = result.stdout or ""
    if capture:
        print(output, end="", flush=True)
    if result.returncode != 0:
        print(f"ERROR: {name} failed (exit {result.returncode}).", file=sys.stderr)
        return False, output
    return True, output


def positive_seconds(text: str) -> float:
    value = float(text)
    if not value > 0 or value == float("inf"):
        raise argparse.ArgumentTypeError("timeout must be a finite positive number")
    return value


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--test-tools", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--test-study", metavar="DIR", help=argparse.SUPPRESS)
    parser.add_argument("--assure-tests", action="store_true",
                        help="run only the required offline assurance tests")
    parser.add_argument("--require-node", action="store_true",
                        help="fail instead of skipping when node is not on PATH")
    parser.add_argument("--timeout", type=positive_seconds, default=DEFAULT_PHASE_TIMEOUT_S,
                        metavar="SECONDS",
                        help="per-phase child-process timeout; expiry fails the gate "
                             f"(default {DEFAULT_PHASE_TIMEOUT_S:g})")
    args = parser.parse_args(argv)
    if args.assure_tests:
        return 0 if run_assurance(args.timeout, tests_only=True) else 1
    if args.test_tools:
        return run_tests()
    if args.test_study:
        return run_tests(ROOT / args.test_study, f"Study tests ({args.test_study})",
                         report_counts=True)
    print(f"Repository: {ROOT}", flush=True)
    print(f"Python: {sys.version.split()[0]} ({Path(sys.executable).resolve()})", flush=True)
    try:
        version = subprocess.run(
            ["git", "--version"], cwd=ROOT, capture_output=True, text=True,
            encoding="utf-8", errors="replace", check=False, env=git_environment(),
            timeout=GIT_TIMEOUT_S,
        )
    except subprocess.TimeoutExpired:
        print("ERROR: Git version check timed out.", file=sys.stderr)
        return 1
    except OSError as error:
        print(f"ERROR: Git is required: {error}", file=sys.stderr)
        return 1
    if version.returncode != 0:
        print("ERROR: Git version check failed.", file=sys.stderr)
        return 1
    print(f"Git: {version.stdout.strip()}", flush=True)
    failed = False
    skips: list[str] = []
    runner = str(Path(__file__).resolve())
    for name, command in (
        ("Scaffold", [sys.executable, str(ROOT / "utils/ci/check.py")]),
        ("Offline tool tests", [sys.executable, runner, "--test-tools"]),
    ):
        ok, _ = run_phase(name, command, args.timeout)
        failed = failed or not ok
    # Study tests run in their own interpreter so study imports stay isolated.
    for study in STUDY_TEST_DIRS:
        name = f"Study tests ({study})"
        ok, output = run_phase(name, [sys.executable, runner, "--test-study", study],
                               args.timeout, capture=True)
        if not ok:
            failed = True
            continue
        counts = parse_study_counts(output)
        if counts is None:
            print(f"ERROR: {name} reported no valid {STUDY_RESULT_MARKER} counts.",
                  file=sys.stderr)
            failed = True
        elif counts["executed"] == 0:
            skips.append(f"study {study}: all {counts['skipped']} skipped, none executed")
        elif counts["skipped"]:
            skips.append(f"study {study}: {counts['skipped']} of "
                         f"{counts['discovered']} skipped")
    print("Running Synthetic render check...", flush=True)
    render = run_render_check(args.require_node, args.timeout)
    if render == "failed":
        failed = True
    elif render == "skipped":
        skips.append("Synthetic render check: skipped: node not found")
    print("Running Assurance...", flush=True)
    if not run_assurance(args.timeout):
        failed = True
    if check_whitespace(ROOT) != 0:
        failed = True
    # Skips keep exit 0 (optional local prerequisites) but never read as a plain pass.
    if failed:
        print("Foundation CI: FAILED.", flush=True)
    elif skips:
        print(f"Foundation CI: passed with skipped checks ({'; '.join(skips)}).", flush=True)
    else:
        print("Foundation CI: passed.", flush=True)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
