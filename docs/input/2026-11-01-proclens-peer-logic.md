# Adopt proclens peer-review logic

Author: user. Recorded: 2026-11-01 11:54 Europe/Berlin by the orchestrator (Claude Code).

> get the peer review and hooks logic from proclens

Source: `gregoryyy/proclens` main at `3d671a3` (`docs/SDLC.md` "Review gates",
`docs/agents/peer.md`, `AGENTS.md`). proclens installs no hooks (its
`docs/agents/README.md`: "No hooks are installed"; no hook files on any branch), so
there is no hooks logic to adopt. Its router and tests are gefly's own, adopted
earlier, with only docstring/criterion-name changes.
