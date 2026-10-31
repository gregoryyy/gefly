#!/usr/bin/env python3
"""Run the offline repository-tool gates from any caller directory (R-BOOT-3)."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
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


def run_tests() -> int:
    """Discover offline tool tests and reject an accidentally empty suite."""
    try:
        suite = unittest.defaultTestLoader.discover(str(ROOT / "utils"), pattern="test_*.py")
    except (ImportError, OSError) as error:
        print(f"ERROR: cannot discover repository-tool tests: {error}", file=sys.stderr)
        return 1
    count = suite.countTestCases()
    if count == 0:
        print("ERROR: no repository-tool tests discovered.", file=sys.stderr)
        return 1
    print(f"Offline repository-tool tests: {count} discovered.", flush=True)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    return 0 if result.wasSuccessful() else 1


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--test-tools", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args(argv)
    if args.test_tools:
        return run_tests()
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
    for name, command in (
        ("Scaffold", [sys.executable, str(ROOT / "utils" / "check.py")]),
        ("Offline tool tests", [sys.executable, str(Path(__file__).resolve()), "--test-tools"]),
    ):
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
    if check_whitespace(ROOT) != 0:
        failed = True
    print(f"Foundation CI: {'FAILED' if failed else 'passed'}.", flush=True)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
