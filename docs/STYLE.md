# Style and interface conventions

## Code and interfaces

Choose language-specific format/lint/type rules with the stack in TODO 1. Keep modules cohesive and dependencies explicit. Prefer pure, testable dynamics and instrument calculations with injected time and randomness. Reject non-finite input at boundaries. Name units and frames; avoid bare `speed`, `altitude` or `heading` when their reference is ambiguous. Convert once at explicit boundaries and test round trips/sign conventions.

Treat code1/code2 as equal implementation streams using the same standards. Shared schemas and lockfiles have one assigned writer. Tests should verify observable behavior, source-backed reference cases, errors and regressions; do not mirror an implementation merely to get coverage.

## Simulator interface

Make control position, instrument meaning, current aircraft configuration, fidelity level, active assists and exercise objective discoverable. Preserve authentic control semantics where modeled; label pedagogical substitutions. Support keyboard navigation, visible focus, accessible labels and non-color status cues. Do not assume a mouse is the only input. Calibrate hardware before interpreting raw axes. Performance/overload failures must be visible.

Use aircraft-appropriate display units with unambiguous labels. Keep indicated/true/ground speed and true/magnetic references distinct. Feedback names the observed behavior and exercise criterion; do not present speculative AI explanation as authoritative aircraft instruction. Visual style, terrain detail and cockpit layout will be refined after the first platform study and exact aircraft choice.

## Written records and output

Use plain, precise language; state outcomes and evidence. Distinguish user decisions, proposals, assumptions and measured results. Central documents use upper-case filenames; research notes and code use lower case. Use relative links within the project and primary-source web links near factual claims. Declare requirements once in SPEC using stable IDs; cite them elsewhere without duplicating authoritative text.

Use numbered stable TODO/GAPS IDs. Record answer changes with date/time/author, newest first, retaining struck-through earlier entries. DONE entries use real clock time to the minute in Europe/Berlin, actual agent identity, TODO/PR references, Implementation notes, Deviations and Insights. Describe which checks ran and which remain untested. Mockups, if added, use generated ASCII bordered rows of equal length, at most 100 columns.
