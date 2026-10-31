#!/usr/bin/env python3
"""Check Gefly's documented scaffold without network access or third-party packages."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

if sys.version_info < (3, 11):
    raise SystemExit("Python 3.11 or newer is required (standard-library tomllib).")

import tomllib


ROOT = Path(__file__).resolve().parent.parent
ROLES = {
    "orchestrator", "researcher", "product", "code1", "code2", "quality", "validate",
    "housekeeping",
}
REQUIRED = {
    "README.md", "AGENTS.md", "CLAUDE.md", "justfile", ".gitignore", ".editorconfig",
    ".github/pull_request_template.md", ".codex/config.toml",
    "docs/BOOT.md", "docs/IDEA.md", "docs/ARCH.md", "docs/EVAL.md", "docs/GAPS.md",
    "docs/SEC.md", "docs/SDLC.md", "docs/STYLE.md", "docs/SBOM.md", "docs/TODO.md",
    "docs/ROAD.md", "docs/DONE.md", "docs/SPEC.md", "docs/design/CONCEPT.md",
    "docs/research/README.md", "utils/pdf/style.css", "utils/pdf/mermaid.html",
    "utils/pdf/latex.lua",
}
IGNORED_DIRS = {
    ".git", "node_modules", ".venv", "venv", "__pycache__", "dist", "build", "target",
    "output", "tmp", ".cache", ".pdfstamps",
}


def markdown_files():
    for path in sorted(ROOT.rglob("*.md")):
        if not IGNORED_DIRS.intersection(path.relative_to(ROOT).parts):
            yield path


def prose_lines(text):
    """Ignore fenced examples and inline code, preserving source line numbers."""
    fence = None
    for number, line in enumerate(text.splitlines(), 1):
        match = re.match(r"^\s*(`{3,}|~{3,})", line)
        if match:
            marker = match.group(1)
            if fence is None:
                fence = marker
            elif marker[0] == fence[0] and len(marker) >= len(fence):
                fence = None
            continue
        if fence is None:
            yield number, re.sub(r"(`+).*?\1", "", line)


def local_links(path, errors):
    for number, line in prose_lines(path.read_text(encoding="utf-8")):
        # Inline links and reference definitions. This is deliberately not a Markdown parser.
        targets = re.findall(r"!?\[[^\]]*\]\((<[^>]+>|[^\s)]+)(?:\s+[^)]*)?\)", line)
        reference = re.match(r"^\s{0,3}\[[^\]]+\]:\s*(<[^>]+>|\S+)", line)
        if reference:
            targets.append(reference.group(1))
        for raw in targets:
            target = raw.strip("<>")
            if any(token in target for token in ("{{", "}}", "<", ">", "*")):
                continue
            parsed = urlsplit(target)
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            linked = path.parent / unquote(parsed.path)
            if not linked.exists():
                errors.append(f"{path.relative_to(ROOT)}:{number}: missing link target {target}")


def read_toml(path, errors):
    try:
        with path.open("rb") as stream:
            return tomllib.load(stream)
    except (OSError, tomllib.TOMLDecodeError) as error:
        errors.append(f"{path.relative_to(ROOT)}: {error}")
        return {}


def agents(errors):
    config = read_toml(ROOT / ".codex/config.toml", errors)
    settings = config.get("agents", {})
    if settings.get("enabled") is not True:
        errors.append(".codex/config.toml: agents.enabled must be true")
    cap = settings.get("max_concurrent_threads_per_session")
    if not isinstance(cap, int) or isinstance(cap, bool) or cap < 1:
        errors.append(".codex/config.toml: agents.max_concurrent_threads_per_session must be positive")
    found = set()
    for path in sorted((ROOT / ".codex/agents").glob("*.toml")):
        data = read_toml(path, errors)
        name = data.get("name")
        if not isinstance(name, str) or name not in ROLES:
            errors.append(f"{path.relative_to(ROOT)}: unknown or missing role name {name!r}")
            continue
        if name in found:
            errors.append(f"{path.relative_to(ROOT)}: duplicate role {name}")
        found.add(name)
        if path.stem != name:
            errors.append(f"{path.relative_to(ROOT)}: filename must match role name")
        if not isinstance(data.get("description"), str) or not data["description"].strip():
            errors.append(f"{path.relative_to(ROOT)}: missing nonempty description")
        instructions = data.get("developer_instructions", "")
        role_path = f"docs/agents/{name}.md"
        if not isinstance(instructions, str) or role_path not in instructions:
            errors.append(f"{path.relative_to(ROOT)}: instructions must reference {role_path}")
        if not (ROOT / role_path).is_file():
            errors.append(f"missing role contract: {role_path}")
    for name in sorted(ROLES - found):
        errors.append(f"missing native agent definition: {name}")


def requirements(area):
    count = 0
    prefix = f"R-{area.upper()}-" if area else "R-"
    for path in markdown_files():
        for number, line in prose_lines(path.read_text(encoding="utf-8")):
            for identifier in re.findall(r" \[(R-[A-Z]+-[0-9]+)\]", line):
                if identifier.startswith(prefix):
                    print(f"{identifier:18} {path.relative_to(ROOT)}:{number}")
                    count += 1
    if not count:
        print("No matching requirement definitions.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reqs", nargs="?", const="", metavar="AREA")
    args = parser.parse_args()
    if args.reqs is not None:
        requirements(args.reqs)
        return 0
    errors = []
    for relative in sorted(REQUIRED):
        if not (ROOT / relative).is_file():
            errors.append(f"missing scaffold file: {relative}")
    entrypoint = ROOT / "CLAUDE.md"
    if entrypoint.is_file() and entrypoint.read_text(encoding="utf-8").strip() != "@AGENTS.md":
        errors.append("CLAUDE.md must contain only @AGENTS.md")
    documents = list(markdown_files())
    for path in documents:
        local_links(path, errors)
    agents(errors)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        print(f"Scaffold check failed with {len(errors)} issue(s).", file=sys.stderr)
        return 1
    print(f"Scaffold check passed: {len(documents)} Markdown files, {len(ROLES)} native agent definitions.")
    print("Scope: file/link targets and agent configuration; external URLs, heading anchors and simulator behavior are not checked.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
