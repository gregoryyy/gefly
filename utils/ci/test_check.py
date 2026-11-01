"""Offline failure boundaries for the R-BOOT-2/R-BOOT-3 scaffold gate."""

from contextlib import redirect_stderr, redirect_stdout
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from . import check


class ScaffoldTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory(prefix="gefly-scaffold-test-")
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name)
        for relative in check.REQUIRED:
            self.write(relative, "# Fixture\n")
        self.write("CLAUDE.md", "@AGENTS.md\n")
        self.write(".codex/config.toml", "[agents]\nenabled = true\n"
                   "max_concurrent_threads_per_session = 3\n")
        for role in ("orchestrator", "researcher", "product", "code1", "code2",
                     "quality", "validate", "peer", "housekeeping"):
            self.write(f"docs/agents/{role}.md", f"# {role}\n")
            instructions = f"Read AGENTS.md and docs/agents/{role}.md."
            if role == "peer":
                instructions += " Claude: utils/peer_review.py --author-provider codex --packet packet.md"
            self.write(f".codex/agents/{role}.toml", f'name = "{role}"\n'
                       'description = "Fixture role"\n'
                       f"developer_instructions = {json.dumps(instructions)}\n")
        self.write(".claude/agents/peer.md", "---\nname: peer\n"
                   "description: Fixture dispatcher\n---\n"
                   "Read docs/agents/peer.md; Codex review via "
                   "utils/peer_review.py --author-provider claude --packet packet.md\n")
        self.write("docs/a reference.md", "# Reference\n")
        self.write("README.md", "[Specification](docs/SPEC.md#scope)\n"
                   "[Reference](docs/a%20reference.md)\n"
                   "[External](https://example.invalid/not-fetched)\n"
                   "```markdown\n[Example](deliberately-absent.md)\n```\n")

    def write(self, relative, text):
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")

    def run_check(self):
        stdout, stderr = io.StringIO(), io.StringIO()
        with patch.object(check, "ROOT", self.root), patch("sys.argv", ["check.py"]):
            with redirect_stdout(stdout), redirect_stderr(stderr):
                code = check.main()
        return code, stdout.getvalue(), stderr.getvalue()

    def assert_rejected(self, diagnostic):
        code, _, stderr = self.run_check()
        self.assertNotEqual(code, 0)
        self.assertIn(diagnostic, stderr)

    def test_complete_fixture_with_encoded_local_link_passes(self):
        code, stdout, stderr = self.run_check()
        self.assertEqual(code, 0, stderr)
        self.assertIn("Scaffold check passed", stdout)
        self.assertEqual(stderr, "")

    def test_missing_required_document_fails(self):
        (self.root / "docs/ARCH.md").unlink()
        self.assert_rejected("missing scaffold file: docs/ARCH.md")

    def test_missing_local_link_target_fails_with_location(self):
        self.write("README.md", "[Broken](docs/missing.md)\n")
        self.assert_rejected("README.md:1: missing link target docs/missing.md")

    def test_malformed_native_toml_fails(self):
        self.write(".codex/agents/code1.toml", 'name = "unterminated\n')
        self.assert_rejected(".codex/agents/code1.toml:")

    def test_missing_native_role_fails(self):
        (self.root / ".codex/agents/quality.toml").unlink()
        self.assert_rejected("missing native agent definition: quality")

    def test_changed_claude_entrypoint_fails(self):
        self.write("CLAUDE.md", "@AGENTS.md\nExtra instructions\n")
        self.assert_rejected("CLAUDE.md must contain only @AGENTS.md")

    def test_same_provider_peer_route_fails(self):
        path = self.root / ".codex/agents/peer.toml"
        self.write(path.relative_to(self.root), path.read_text(encoding="utf-8").replace(
            "--author-provider codex", "--author-provider claude"))
        self.assert_rejected("peer dispatcher must invoke utils/peer_review.py --author-provider codex")

    def test_malformed_claude_peer_frontmatter_fails(self):
        path = self.root / ".claude/agents/peer.md"
        self.write(path.relative_to(self.root), path.read_text(encoding="utf-8").replace(
            "name: peer", "name: quality"))
        self.assert_rejected("frontmatter must declare exactly one name: peer")


if __name__ == "__main__":
    unittest.main()
