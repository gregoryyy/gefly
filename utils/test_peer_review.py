"""Contract/error-path tests for R-AGENT-7; no live model calls."""

import copy
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import peer_review


def report(status="pass", recommendation="accept"):
    return {
        "quality": [],
        "validation": [{"criterion": "R-AGENT-7 routing", "expected": "other product",
                        "observed": "mocked external response", "status": status,
                        "evidence": "mock process fixture, not live provider evidence"}],
        "recommendation": recommendation, "limitations": ["mocked tests only"],
    }


def output(provider, review):
    if provider == "claude":
        return json.dumps({"type": "result", "is_error": False,
                           "result": json.dumps(review),
                           "modelUsage": {"claude-test-model": {}},
                           "account": "must-not-be-exported"})
    return "\n".join(json.dumps(event) for event in [
        {"type": "thread.started", "thread_id": "discard-me"},
        {"type": "item.completed", "item": {"type": "agent_message",
         "text": json.dumps(review)}},
        {"type": "turn.completed", "model": "codex-test-model"},
    ])


class PeerReviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.packet = Path(self.temp.name) / "packet.md"
        self.packet.write_text("Revision: deadbeef\n# Criteria\nR-AGENT-7\n", encoding="utf-8")
        self.which = patch("peer_review.shutil.which", side_effect=lambda name: "/cli/" + name)
        self.which.start()
        self.addCleanup(self.which.stop)

    def run_mock(self, author="codex", review=None, response=None, returncode=0):
        reviewer = peer_review.PROVIDERS[author]
        response = output(reviewer, review or report()) if response is None else response
        with patch("peer_review.subprocess.run", side_effect=[
            subprocess.CompletedProcess([], 0, "2.1.193 (CLI)", "private version detail"),
            subprocess.CompletedProcess([], returncode, response, "PRIVATE AUTH FAILURE"),
        ]) as run:
            envelope, code = peer_review.run_review(author, self.packet)
        return envelope, code, run

    def test_reciprocal_routing_and_flags(self):
        for author, reviewer in peer_review.PROVIDERS.items():
            with self.subTest(author=author):
                envelope, code, run = self.run_mock(author)
                self.assertEqual((envelope["status"], envelope["accepted"], code),
                                 ("completed", True, 0))
                self.assertEqual(envelope["reviewer_provider"], reviewer)
                args, kwargs = run.call_args
                self.assertEqual(args[0][0], "/cli/" + reviewer)
                self.assertIn("R-AGENT-7", kwargs["input"])
                self.assertNotIn("shell", kwargs)
                self.assertEqual(kwargs["timeout"], 180)
                if reviewer == "claude":
                    self.assertIn("--safe-mode", args[0])
                    self.assertEqual(args[0][args[0].index("--tools") + 1], "")
                    self.assertIn("--no-session-persistence", args[0])
                else:
                    self.assertIn("read-only", args[0])
                    self.assertNotIn("--ephemeral", args[0])
                    self.assertNotIn("resume", args[0])

    def test_hash_revision_and_only_allowlisted_metadata(self):
        envelope, _, _ = self.run_mock()
        self.assertEqual(envelope["packet"]["sha256"],
                         hashlib.sha256(self.packet.read_bytes()).hexdigest())
        self.assertEqual(envelope["packet"]["revision"], "deadbeef")
        self.assertEqual(envelope["model_evidence"], ["claude-test-model"])
        self.assertEqual(envelope["cli"]["version"], "2.1.193")
        self.assertNotIn("must-not-be-exported", json.dumps(envelope))
        self.assertNotIn("PRIVATE", json.dumps(envelope))

    def test_dry_run_has_no_provider_invocation_or_pass(self):
        with patch("peer_review.subprocess.run") as run:
            envelope, code = peer_review.run_review("codex", self.packet, dry_run=True)
        run.assert_not_called()
        self.assertEqual(code, 0)
        self.assertFalse(envelope["accepted"])
        self.assertEqual(envelope["status"], "dry_run")
        self.assertIsNone(envelope["review"])
        self.assertIn("command", envelope)

    def test_missing_binary_blocks_without_fallback(self):
        with patch("peer_review.shutil.which", return_value=None) as which:
            with patch("peer_review.subprocess.run") as run:
                envelope, code = peer_review.run_review("codex", self.packet)
        which.assert_called_once_with("claude")
        run.assert_not_called()
        self.assertEqual((code, envelope["diagnostic"]), (2, "missing_reviewer_cli"))

    def test_auth_or_nonzero_exit_never_exports_stderr(self):
        envelope, code, _ = self.run_mock(returncode=1)
        self.assertEqual((code, envelope["diagnostic"]), (2, "reviewer_nonzero_exit"))
        self.assertNotIn("PRIVATE", json.dumps(envelope))
        self.assertIsNone(envelope["review"])

    def test_claude_error_wrapper_cannot_pass(self):
        wrapper = json.dumps({"type": "result", "is_error": True,
                              "result": json.dumps(report())})
        envelope, code, _ = self.run_mock(response=wrapper)
        self.assertEqual((code, envelope["diagnostic"]), (2, "provider_error"))

    def test_timeout_and_launch_failure_block(self):
        for error, diagnostic in [
            (subprocess.TimeoutExpired("claude", 1, stderr="SECRET"), "reviewer_timeout"),
            (OSError("SECRET"), "reviewer_launch_failed"),
        ]:
            with self.subTest(diagnostic=diagnostic):
                with patch("peer_review.cli_version", return_value="unknown"):
                    with patch("peer_review.subprocess.run", side_effect=error):
                        envelope, code = peer_review.run_review("codex", self.packet)
                self.assertEqual((code, envelope["diagnostic"]), (2, diagnostic))
                self.assertNotIn("SECRET", json.dumps(envelope))

    def test_malformed_and_incomplete_reviews_block(self):
        variants = ["not json", json.dumps({"result": "{}"}),
                    json.dumps({"result": json.dumps({**report(), "validation": []})})]
        incomplete = copy.deepcopy(report())
        del incomplete["validation"][0]["evidence"]
        variants.append(output("claude", incomplete))
        for key in ("recommendation", "validation"):
            malformed = copy.deepcopy(report())
            malformed[key] = {}
            variants.append(output("claude", malformed))
        malformed = copy.deepcopy(report())
        malformed["validation"][0]["status"] = []
        variants.append(output("claude", malformed))
        for response in variants:
            with self.subTest(response=response):
                envelope, code, _ = self.run_mock(response=response)
                self.assertEqual((envelope["status"], code), ("blocked", 2))
                self.assertFalse(envelope["accepted"])

    def test_failed_criterion_is_completed_but_rejected(self):
        envelope, code, _ = self.run_mock(review=report("fail", "changes_required"))
        self.assertEqual((envelope["status"], envelope["accepted"], code),
                         ("completed", False, 1))
        self.assertEqual(envelope["review"]["validation"][0]["status"], "fail")

    def test_blocked_or_not_evaluated_cannot_pass(self):
        for state in ("blocked", "not_evaluated"):
            for recommendation in ("blocked", "accept", "changes_required"):
                with self.subTest(state=state, recommendation=recommendation):
                    envelope, code, _ = self.run_mock(review=report(state, recommendation))
                    self.assertEqual((envelope["status"], envelope["accepted"], code),
                                     ("blocked", False, 2))

    def test_accept_with_high_quality_finding_blocks(self):
        review = report()
        review["quality"] = [{"severity": "high", "location": "file:1",
                              "description": "defect", "evidence": "fixture"}]
        envelope, code, _ = self.run_mock(review=review)
        self.assertEqual((code, envelope["diagnostic"]), (2, "inconsistent_recommendation"))

    def test_tool_output_cannot_supply_codex_review(self):
        response = json.dumps({"type": "item.completed", "item": {
            "type": "command_execution", "aggregated_output": json.dumps(report())}})
        envelope, code, _ = self.run_mock("claude", response=response)
        self.assertEqual((code, envelope["diagnostic"]), (2, "forbidden_tool_use"))

    def test_codex_tool_call_also_invalidates_a_valid_final_review(self):
        response = json.dumps({"type": "item.started", "item": {
            "type": "mcp_tool_call", "server": "irrelevant"}}) + "\n" + output("codex", report())
        envelope, code, _ = self.run_mock("claude", response=response)
        self.assertEqual((code, envelope["diagnostic"]), (2, "forbidden_tool_use"))

    def test_missing_revision_blocks_live_review(self):
        self.packet.write_text("No revision metadata\n", encoding="utf-8")
        with patch("peer_review.subprocess.run") as run:
            envelope, code = peer_review.run_review("codex", self.packet)
        run.assert_not_called()
        self.assertEqual((code, envelope["diagnostic"]), (2, "missing_packet_revision"))

    def test_whitespace_only_json_revision_blocks_before_provider_process(self):
        self.packet.write_text(json.dumps({"revision": "   "}), encoding="utf-8")
        with patch("peer_review.subprocess.run") as run:
            envelope, code = peer_review.run_review("codex", self.packet)
        run.assert_not_called()
        self.assertEqual((code, envelope["diagnostic"]), (2, "missing_packet_revision"))
        self.assertEqual(peer_review.packet_revision('{"revision":"  deadbeef  "}'),
                         "deadbeef")

    def test_blank_markdown_revision_cannot_consume_following_header(self):
        self.packet.write_text("Revision: \nAuthor: codex\n", encoding="utf-8")
        with patch("peer_review.subprocess.run") as run:
            envelope, code = peer_review.run_review("codex", self.packet)
        run.assert_not_called()
        self.assertEqual((code, envelope["diagnostic"]), (2, "missing_packet_revision"))

    def test_invalid_timeout_never_invokes_provider(self):
        for timeout in (0, -1, 901, float("inf"), float("nan")):
            with self.subTest(timeout=timeout), patch("peer_review.subprocess.run") as run:
                envelope, code = peer_review.run_review("codex", self.packet, timeout)
            run.assert_not_called()
            self.assertEqual((code, envelope["diagnostic"]), (2, "invalid_timeout"))

    def test_unreadable_packet_blocks(self):
        envelope, code = peer_review.run_review("codex", self.packet.with_suffix(".missing"))
        self.assertEqual((code, envelope["diagnostic"]), (2, "unreadable_packet"))


if __name__ == "__main__":
    unittest.main()
