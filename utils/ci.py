#!/usr/bin/env python3
"""Run the offline repository-tool gates from any caller directory (R-BOOT-3)."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import shutil
import subprocess
import sys
import unittest


ROOT = Path(__file__).resolve().parent.parent


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
            env=environment,
        )
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
                errors="replace", check=False, env=environment,
            )
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


def run_tests(start: Path | None = None, label: str = "Offline repository-tool tests") -> int:
    """Discover offline tests under ``start`` and reject an accidentally empty suite.

    Skipped tests are counted and listed with their reasons so that a skip is
    visible and never reported as an executed pass.
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
    return 0 if result.wasSuccessful() else 1


def run_render_check(require_node: bool) -> str:
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
    try:
        version = subprocess.run([node, "--version"], cwd=ROOT, capture_output=True,
                                 text=True, encoding="utf-8", errors="replace",
                                 check=False)
        print(f"Node: {version.stdout.strip() or 'unknown version'} "
              f"({Path(node).resolve()})", flush=True)
        result = subprocess.run([node, str(script)], cwd=ROOT, check=False)
    except OSError as error:
        print(f"ERROR: cannot run synthetic render check: {error}", file=sys.stderr)
        return "failed"
    if result.returncode != 0:
        print(f"ERROR: Synthetic render check failed (exit {result.returncode}).",
              file=sys.stderr)
        return "failed"
    print("Synthetic render check: passed.", flush=True)
    return "passed"


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--test-tools", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--test-study", metavar="DIR", help=argparse.SUPPRESS)
    parser.add_argument("--require-node", action="store_true",
                        help="fail instead of skipping when node is not on PATH")
    args = parser.parse_args(argv)
    if args.test_tools:
        return run_tests()
    if args.test_study:
        return run_tests(ROOT / args.test_study, f"Study tests ({args.test_study})")
    print(f"Repository: {ROOT}", flush=True)
    print(f"Python: {sys.version.split()[0]} ({Path(sys.executable).resolve()})", flush=True)
    try:
        version = subprocess.run(
            ["git", "--version"], cwd=ROOT, capture_output=True, text=True,
            encoding="utf-8", errors="replace", check=False, env=git_environment(),
        )
    except OSError as error:
        print(f"ERROR: Git is required: {error}", file=sys.stderr)
        return 1
    if version.returncode != 0:
        print("ERROR: Git version check failed.", file=sys.stderr)
        return 1
    print(f"Git: {version.stdout.strip()}", flush=True)
    failed = False
    runner = str(Path(__file__).resolve())
    phases = [
        ("Scaffold", [sys.executable, str(ROOT / "utils" / "check.py")]),
        ("Offline tool tests", [sys.executable, runner, "--test-tools"]),
    ]
    # Study tests run in their own interpreter so study imports stay isolated.
    phases += [(f"Study tests ({study})", [sys.executable, runner, "--test-study", study])
               for study in STUDY_TEST_DIRS]
    for name, command in phases:
        print(f"Running {name}...", flush=True)
        try:
            result = subprocess.run(command, cwd=ROOT, check=False)
        except OSError as error:
            print(f"ERROR: cannot run {name}: {error}", file=sys.stderr)
            failed = True
            continue
        if result.returncode != 0:
            print(f"ERROR: {name} failed (exit {result.returncode}).", file=sys.stderr)
            failed = True
    print("Running Synthetic render check...", flush=True)
    render = run_render_check(args.require_node)
    if render == "failed":
        failed = True
    if check_whitespace(ROOT) != 0:
        failed = True
    if failed:
        print("Foundation CI: FAILED.", flush=True)
    elif render == "skipped":
        print("Foundation CI: passed with skipped check "
              "(Synthetic render check: skipped: node not found).", flush=True)
    else:
        print("Foundation CI: passed.", flush=True)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
