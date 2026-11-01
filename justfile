# Gefly: repository checks and document builds.
# Propeller-derived document recipes: GPL-3.0-or-later; adapted 2026-10-31.
# See THIRD_PARTY_NOTICES.md and LICENSES/GPL-3.0-or-later.txt.
# Document pipeline adapted from ../propeller/justfile (itself adapted from kibitz).
# Runtime dependencies for PDFs: pandoc and Google Chrome. CHROME overrides its path.
# TeX Live is needed only for fenced latex/tex blocks; Mermaid fetches its pinned script.
set positional-arguments

chrome   := env_var_or_default("CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
css      := justfile_directory() / "utils/pdf/style.css"
mermaid  := justfile_directory() / "utils/pdf/mermaid.html"
latex    := justfile_directory() / "utils/pdf/latex.lua"
stampdir := justfile_directory() / ".pdfstamps"

# List available recipes
default:
    @just --list

# Check the scaffold, local document links and native agent definitions; no PDF tools needed
check:
    python3 "{{justfile_directory()}}/utils/ci/check.py"

# Run the same offline foundation gates used by the hosted workflow
ci:
    python3 "{{justfile_directory()}}/utils/ci/run.py"

# Run standard-library repository-tool tests without invoking live providers
test-tools:
    python3 -m unittest discover -s "{{justfile_directory()}}/utils" -p 'test_*.py'

# Query or check the generated assurance lineage; no providers or browser
assure *args:
    #!/usr/bin/env bash
    set -euo pipefail
    node "{{justfile_directory()}}/utils/assure/src/cli.ts" "$@"

# Run the offline assurance suite, rejecting missing, empty or skipped tests
assure-test:
    python3 "{{justfile_directory()}}/utils/ci/run.py" --assure-tests

# Write rebuildable graph JSON and Markdown report under ignored utils/assure/out
lineage:
    node "{{justfile_directory()}}/utils/assure/src/cli.ts" lineage

# Review a frozen packet through the provider opposite its declared author
peer-review author packet:
    python3 "{{justfile_directory()}}/utils/peer_review.py" --author-provider "$1" --packet "$2"

# Preview peer routing and packet handling without invoking either provider
peer-preview author packet:
    python3 "{{justfile_directory()}}/utils/peer_review.py" --author-provider "$1" --packet "$2" --dry-run

# Every Markdown source under PATHS; ignored files, agent entrypoints and PR templates excluded
[private]
sources *PATHS:
    #!/usr/bin/env bash
    set -euo pipefail
    cd "{{justfile_directory()}}"
    paths=("$@")
    if [ "${#paths[@]}" -eq 0 ]; then paths=(.); fi
    if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        git ls-files --cached --others --exclude-standard -- "${paths[@]}"
    else
        find "${paths[@]}" -type f -name '*.md' -not -path '*/node_modules/*' -not -path '*/.git/*' | sed 's|^\./||'
    fi | awk '/\.md$/ && !/(^|\/)(AGENTS|CLAUDE)\.md$/ && !/^\.github\// { print }' | sort -u

# Build one source into its adjacent A4 PDF (foo.md.pdf), incrementally
pdf file:
    #!/usr/bin/env bash
    set -euo pipefail
    cd "{{justfile_directory()}}"
    src="$1"
    case "$src" in *.md) ;; *) echo "ERROR: not a .md file: $src" >&2; exit 2 ;; esac
    [ -f "$src" ] || { echo "ERROR: source does not exist: $src" >&2; exit 2; }
    command -v pandoc >/dev/null || { echo "ERROR: pandoc is required for PDFs (brew install pandoc)." >&2; exit 2; }
    [ -x "{{chrome}}" ] || { echo "ERROR: install Google Chrome or set CHROME to its executable path." >&2; exit 2; }
    dir="$(cd "$(dirname "$src")" && pwd)"
    base="$(basename "$src")"
    out="$dir/$base.pdf"
    mkdir -p "{{stampdir}}"
    # Images are not hashed: after editing only an image, delete its document PDF.
    hash="$(cat "$src" "{{css}}" "{{mermaid}}" "{{latex}}" | shasum -a 256 | cut -d' ' -f1)"
    stamp="{{stampdir}}/$(printf '%s' "$out" | shasum -a 256 | cut -c1-16).sha"
    if [ -f "$out" ]; then
        outhash="$(shasum -a 256 "$out" | cut -d' ' -f1)"
        if [ -f "$stamp" ] && [ "$(cat "$stamp")" = "$hash $outhash" ]; then
            echo "up to date: $out"; exit 0
        fi
        if [ ! -f "$stamp" ] && [ "$out" -nt "$src" ] && [ "$out" -nt "{{css}}" ] && [ "$out" -nt "{{mermaid}}" ] && [ "$out" -nt "{{latex}}" ]; then
            printf '%s %s\n' "$hash" "$outhash" > "$stamp"
            echo "up to date: $out"; exit 0
        fi
    fi
    tmp="$(mktemp -d)"
    trap 'rm -rf "$tmp"' EXIT
    extra=()
    if grep -q '^```mermaid' "$src"; then extra=(--include-in-header "{{mermaid}}"); fi
    LATEX_CACHE="{{stampdir}}/latex" pandoc "$src" -f gfm+tex_math_dollars+tex_math_gfm -o "$tmp/doc.html" \
        --standalone --embed-resources --mathml --lua-filter "{{latex}}" \
        --resource-path "$dir" --css "{{css}}" --metadata pagetitle="$base" ${extra[@]+"${extra[@]}"}
    # Chrome may finish the PDF without exiting; wait for stable output, then stop our process.
    "{{chrome}}" --headless --disable-gpu --no-first-run --no-default-browser-check --disable-extensions \
        --virtual-time-budget=15000 --timeout=20000 --user-data-dir="$tmp/chrome-profile" \
        --no-pdf-header-footer --print-to-pdf="$tmp/out.pdf" "$tmp/doc.html" >"$tmp/chrome.log" 2>&1 &
    pid=$!
    done=""
    for _ in $(seq 1 120); do
        if ! kill -0 "$pid" 2>/dev/null; then done=1; break; fi
        if [ -s "$tmp/out.pdf" ]; then
            s1=$(wc -c < "$tmp/out.pdf"); sleep 0.5; s2=$(wc -c < "$tmp/out.pdf" 2>/dev/null || echo 0)
            if [ "$s1" = "$s2" ]; then kill "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true; done=1; break; fi
        fi
        sleep 0.5
    done
    if [ -z "$done" ]; then kill -9 "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true; echo "ERROR: Chrome timed out after 60 s" >&2; cat "$tmp/chrome.log" >&2; exit 1; fi
    if [ ! -s "$tmp/out.pdf" ]; then echo "ERROR: Chrome produced no PDF" >&2; cat "$tmp/chrome.log" >&2; exit 1; fi
    mv "$tmp/out.pdf" "$out"
    printf '%s %s\n' "$hash" "$(shasum -a 256 "$out" | cut -d' ' -f1)" > "$stamp"
    echo "wrote $out"

# Build all Markdown documents under PATHS, or the entire repository
pdfs *PATHS:
    #!/usr/bin/env bash
    set -euo pipefail
    cd "{{justfile_directory()}}"
    list="$(mktemp)"
    trap 'rm -f "$list"' EXIT
    just sources "$@" > "$list"
    fail=0
    while IFS= read -r f; do
        just pdf "$f" || { echo "FAILED: $f" >&2; fail=1; }
    done < "$list"
    exit "$fail"

# Alias for pdfs
docs *PATHS: (pdfs PATHS)

# Print requirement identifiers and their authoritative source locations
reqs area="":
    python3 "{{justfile_directory()}}/utils/ci/check.py" --reqs "$1"

# Print commit references; optional literal ID filter
refs id="":
    #!/usr/bin/env bash
    set -euo pipefail
    cd "{{justfile_directory()}}"
    if ! git rev-parse --verify HEAD >/dev/null 2>&1; then echo "No commits yet."; exit 0; fi
    git log --no-merges --date=format:'%Y-%m-%d %H:%M' \
        --format='%h %ad %s%n    Refs: %(trailers:key=Refs,valueonly,separator=%x2C )' \
        | awk -v id="$1" 'NR % 2 == 1 { head = $0; next } { if (id == "" || index($0, id)) { print head; print $0 } }'

# Remove generated document PDFs and their incremental build stamps
clean:
    #!/usr/bin/env bash
    set -euo pipefail
    cd "{{justfile_directory()}}"
    find . -type f -name '*.md.pdf' -not -path '*/node_modules/*' -not -path '*/.git/*' -delete
    rm -rf .pdfstamps

# Build the local-only JSBSim research runtime (not a distributable aircraft model)
build-flight-engine:
    bash "{{justfile_directory()}}/studies/e1-browser/sim/build.sh" "{{justfile_directory()}}/output/flight/engine-build"

# Fly the experimental browser prototype on localhost:5173
fly:
    npm --prefix "{{justfile_directory()}}/app" run dev
