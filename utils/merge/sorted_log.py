#!/usr/bin/env python3
"""Git merge driver for newest-first Markdown logs such as docs/DONE.md.

Git calls it as ``sorted_log.py %O %A %B %P`` (base, ours, theirs, path). The
result is written to the ours file. Exit 0 means a clean merge and 1 means
conflict markers remain. Each ``## `` heading starts an entry; entries merge
three-way by heading and are written newest first by a leading
``YYYY-MM-DD HH:MM`` stamp; headings inside code fences do not start entries.
The preamble before the first heading merges with ``git merge-file``. Duplicate
headings, existing conflict markers, an entry removed on both sides while either
side adds entries, and any parsing or processing failure fall back to a plain
``git merge-file --diff3`` result with exit 1, so content is never dropped.
"""

import os
import re
import subprocess
import sys
import tempfile


HEADING = re.compile(r"^## ")
STAMP = re.compile(r"^## (\d{4}-\d{2}-\d{2} \d{2}:\d{2})(?!\d)")
MARKER = re.compile(r"^(<{7}|>{7})( |$)")
FENCE = re.compile(r"^ {0,3}(`{3,}|~{3,})")
OURS, BASE, THEIRS = "ours", "base", "theirs"
TOP = "9999-99-99 99:99"


class MergeError(Exception):
    """The input cannot be merged safely as a sorted log."""


def decode(data):
    """Return LF text and whether the bytes used CRLF line endings."""
    text = data.decode("utf-8")
    crlf = "\r\n" in text
    return text.replace("\r\n", "\n"), crlf


def blank(line):
    return line.strip(" \t") == ""


def split(text):
    """Split text into a preamble and ordered ``(heading, original, normalised)`` entries.

    A ``## `` line starts an entry unless it lies inside a fenced code block
    (three or more backticks or tildes). Entries keep their original lines;
    only trailing blank lines are dropped. The normalised form, used for
    comparison only, strips trailing spaces and tabs from each line. Any
    heading that occurs twice raises ``MergeError`` so the caller falls back.
    """
    lines = text.split("\n")
    if lines and lines[-1] == "":
        lines.pop()
    starts, fence = [], None
    for i, line in enumerate(lines):
        if MARKER.match(line):
            raise MergeError("input already contains conflict markers")
        match = FENCE.match(line)
        if match:
            marker = match.group(1)
            if fence is None:
                fence = marker
            elif (marker[0] == fence[0] and len(marker) >= len(fence)
                  and blank(line[match.end():])):
                fence = None
            continue
        if fence is None and HEADING.match(line):
            starts.append(i)
    end = starts[0] if starts else len(lines)
    preamble = lines[:end]
    while preamble and blank(preamble[-1]):
        preamble.pop()
    entries, seen = [], set()
    for n, start in enumerate(starts):
        stop = starts[n + 1] if n + 1 < len(starts) else len(lines)
        block = lines[start:stop]
        while block and blank(block[-1]):
            block.pop()
        heading = block[0].rstrip(" \t")
        if heading in seen:
            raise MergeError(f"duplicate heading {heading!r}")
        seen.add(heading)
        entries.append((heading, "\n".join(block),
                        "\n".join(line.rstrip(" \t") for line in block)))
    return "\n".join(preamble), entries


def merge_file(ours, base, theirs):
    """Three-way merge text with ``git merge-file -p``; return (text, clean)."""
    with tempfile.TemporaryDirectory(prefix="sorted-log-") as tmp:
        paths = []
        for name, text in ((OURS, ours), (BASE, base), (THEIRS, theirs)):
            path = os.path.join(tmp, name)
            with open(path, "w", encoding="utf-8", newline="") as handle:
                handle.write(text)
            paths.append(path)
        result = subprocess.run(
            ["git", "merge-file", "-p", "--diff3", "-L", OURS, "-L", BASE, "-L", THEIRS, *paths],
            capture_output=True, check=False)
    if result.returncode < 0 or result.returncode > 127:
        raise MergeError(f"git merge-file failed: {result.stderr.decode('utf-8', 'replace')}")
    return result.stdout.decode("utf-8"), result.returncode == 0


def merge_preamble(ours, base, theirs):
    norm = lambda text: "\n".join(line.rstrip(" \t") for line in text.split("\n"))
    if norm(ours) == norm(theirs) or norm(theirs) == norm(base):
        return ours, True
    if norm(ours) == norm(base):
        return theirs, True
    text, clean = merge_file(*(part + "\n" if part else "" for part in (ours, base, theirs)))
    return text.rstrip("\n"), clean


def conflict(ours, base, theirs):
    """Return a diff3-style conflict block; ``None`` marks a missing side."""
    lines = [f"<<<<<<< {OURS}"]
    if ours is not None:
        lines.append(ours)
    if base is not None:
        lines += [f"||||||| {BASE}", base]
    lines.append("=======")
    if theirs is not None:
        lines.append(theirs)
    lines.append(f">>>>>>> {THEIRS}")
    return "\n".join(lines)


def merge_entry(ours, base, theirs):
    """Merge one entry given (original, normalised) pairs or ``None``.

    Return (original text or None for deletion, clean).
    """
    norm = lambda side: None if side is None else side[1]
    text = lambda side: None if side is None else side[0]
    if norm(ours) == norm(theirs) or norm(theirs) == norm(base):
        return text(ours), True
    if norm(ours) == norm(base):
        return text(theirs), True
    return conflict(text(ours), text(base), text(theirs)), False


def stamps(entries):
    """Map each heading to its sort stamp; an unstamped entry follows its predecessor."""
    result, current = {}, TOP
    for heading, _, _ in entries:
        match = STAMP.match(heading)
        if match:
            current = match.group(1)
        result[heading] = current
    return result


def merge_logs(ours_text, base_text, theirs_text):
    """Merge three LF log texts; return (text, clean)."""
    ours_pre, ours = split(ours_text)
    base_pre, base = split(base_text)
    theirs_pre, theirs = split(theirs_text)

    ours_map = {key: (text, norm) for key, text, norm in ours}
    base_map = {key: (text, norm) for key, text, norm in base}
    theirs_map = {key: (text, norm) for key, text, norm in theirs}
    gone = [key for key in base_map if key not in ours_map and key not in theirs_map]
    if gone and any(key not in base_map for key in (*ours_map, *theirs_map)):
        # A rename or re-stamp on one side may meet a deletion or rename on the other.
        raise MergeError("an entry was removed on both sides while entries were added")

    preamble, clean = merge_preamble(ours_pre, base_pre, theirs_pre)
    order = [key for key, _, _ in ours]
    order += [key for key, _, _ in theirs if key not in ours_map]
    order += [key for key, _, _ in base if key not in ours_map and key not in theirs_map]
    sort_key = {**stamps(base), **stamps(theirs), **stamps(ours)}

    merged = []
    for position, key in enumerate(order):
        text, ok = merge_entry(ours_map.get(key), base_map.get(key), theirs_map.get(key))
        clean = clean and ok
        if text is not None:
            merged.append((sort_key[key], position, text))
    # Newest first; equal stamps keep ours order, then theirs-only entries.
    merged.sort(key=lambda item: item[1])
    merged.sort(key=lambda item: item[0], reverse=True)

    parts = ([preamble] if preamble else []) + [text for _, _, text in merged]
    output = "\n\n".join(parts)
    return (output + "\n" if output else ""), clean


def read(path):
    with open(path, "rb") as handle:
        return handle.read()


def fallback(ours, base, theirs):
    """Plain line merge for unparseable input; keeps both sides on any failure."""
    try:
        text, _ = merge_file(*(data.decode("utf-8", "surrogateescape") for data in (ours, base, theirs)))
        return text.encode("utf-8", "surrogateescape")
    except Exception:  # last resort: never drop either side
        tail = lambda data: data if data.endswith(b"\n") or not data else data + b"\n"
        return (b"<<<<<<< " + OURS.encode() + b"\n" + tail(ours) + b"=======\n"
                + tail(theirs) + b">>>>>>> " + THEIRS.encode() + b"\n")


def main(argv):
    if len(argv) < 3:
        print("usage: sorted_log.py BASE OURS THEIRS [PATH]", file=sys.stderr)
        return 2
    base_path, ours_path, theirs_path = argv[:3]
    label = argv[3] if len(argv) > 3 else ours_path
    base, ours, theirs = read(base_path), read(ours_path), read(theirs_path)
    try:
        (ours_text, crlf), (base_text, _), (theirs_text, _) = map(decode, (ours, base, theirs))
        text, clean = merge_logs(ours_text, base_text, theirs_text)
        output = (text.replace("\n", "\r\n") if crlf else text).encode("utf-8")
    except Exception as error:  # any failure: plain merge with markers
        print(f"sorted-log: {label}: falling back to git merge-file ({error})", file=sys.stderr)
        output, clean = fallback(ours, base, theirs), False
    with open(ours_path, "wb") as handle:
        handle.write(output)
    if not clean:
        print(f"sorted-log: {label}: conflict markers remain", file=sys.stderr)
    return 0 if clean else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
