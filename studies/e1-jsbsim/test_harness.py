"""Tests for the E1 JSBSim study harness.

Unit-conversion tests need only the standard library. Engine tests skip cleanly
when the ``jsbsim`` package is not importable (the repository CI installs none).
"""

from __future__ import annotations

import importlib.util
import math
import json
import os
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import harness  # noqa: E402

HAVE_JSBSIM = importlib.util.find_spec("jsbsim") is not None


class UnitConversionTests(unittest.TestCase):
    def test_exact_definitions(self):
        self.assertEqual(harness.ft_to_m(1.0), 0.3048)
        self.assertEqual(harness.ft_to_m(4000.0), 1219.2)
        self.assertAlmostEqual(harness.kt_to_mps(1.0), 1852.0 / 3600.0, places=15)
        self.assertAlmostEqual(harness.deg_to_rad(180.0), math.pi, places=15)

    def test_round_trips(self):
        for value in (-1234.5, 0.0, 1e-9, 51.4, 4000.0):
            self.assertAlmostEqual(harness.m_to_ft(harness.ft_to_m(value)), value, places=9)
            self.assertAlmostEqual(harness.mps_to_kt(harness.kt_to_mps(value)), value, places=9)
            self.assertAlmostEqual(harness.rad_to_deg(harness.deg_to_rad(value)), value, places=9)

    def test_sign_preserved(self):
        self.assertLess(harness.ft_to_m(-10.0), 0.0)
        self.assertLess(harness.deg_to_rad(-90.0), 0.0)

    def test_rejects_non_finite(self):
        for func in (harness.ft_to_m, harness.m_to_ft, harness.kt_to_mps,
                     harness.mps_to_kt, harness.deg_to_rad, harness.rad_to_deg):
            for bad in (math.nan, math.inf, -math.inf):
                with self.assertRaises(ValueError):
                    func(bad)

    def test_consecutive_orders_first_and_second_order(self):
        rates = (60, 120, 240, 480)
        for order in (1, 2):
            samples = {hz: {t: {"y": t + 3.0 * (1.0 / hz) ** order} for t in (1.0, 2.0)}
                       for hz in rates}
            diffs, orders = harness.consecutive_orders(samples, rates, ("y",))
            self.assertEqual(set(diffs), {60, 120, 240})
            for value in orders.values():
                self.assertAlmostEqual(value["y"], float(order), places=9)

    def test_consecutive_orders_zero_difference_is_none(self):
        rates = (60, 120, 240)
        samples = {hz: {1.0: {"y": 5.0}} for hz in rates}
        _, orders = harness.consecutive_orders(samples, rates, ("y",))
        self.assertIsNone(orders["60/120"]["y"])

    def test_pack_is_bitwise(self):
        self.assertNotEqual(harness.pack([0.0]), harness.pack([-0.0]))
        self.assertEqual(len(harness.pack([1.0, 2.0])), 16)


class FakeFdm:
    """Stand-in FDM: zero state; ``run()`` result and time advance are configurable."""

    def __init__(self, dt_s, run_result=True, advances=True, fail_after=None):
        self.dt_s, self.run_result, self.advances = dt_s, run_result, advances
        self.fail_after, self.calls = fail_after, 0
        self.props = {}

    def __getitem__(self, name):
        return self.props.get(name, 0.0)

    def __setitem__(self, name, value):
        self.props[name] = value

    def load_ic(self, *_):
        return True

    def run_ic(self):
        return True

    def run(self):
        self.calls += 1
        if self.fail_after is not None and self.calls > self.fail_after:
            return False
        if self.advances:
            self.props[harness.SIM_TIME] = self[harness.SIM_TIME] + self.dt_s
        return self.run_result


class FailedStepTests(unittest.TestCase):
    """A failed or stalled engine step must fail fixtures, not pass them (no jsbsim)."""

    DT_S = 1.0 / 120.0

    def _patched(self, **fake_kwargs):
        made = []

        def make(dt_s, *_):
            made.append(FakeFdm(dt_s, **fake_kwargs))
            return made[-1]

        trim = {"success": True}
        return (mock.patch.object(harness, "make_fdm", side_effect=make),
                mock.patch.object(harness, "trim", return_value=trim), made)

    def _assert_fails(self, call, **fake_kwargs):
        make, trim, made = self._patched(**fake_kwargs)
        with make, trim, self.assertRaises(RuntimeError) as caught:
            call()
        self.assertTrue(made, "fixture did not use the fake FDM")
        return str(caught.exception)

    def test_healthy_fake_passes_stationary(self):
        make, trim, _ = self._patched()
        with make, trim:
            result = harness.fixture_stationary(settle_s=0.5, observe_s=0.5)
        self.assertEqual(result["max_speed_mps"], 0.0)

    def test_stationary_rejects_false_run(self):
        message = self._assert_fails(
            lambda: harness.fixture_stationary(settle_s=0.5, observe_s=0.5),
            run_result=False)
        self.assertIn("settle step 0", message)

    def test_stationary_rejects_false_run_while_observing(self):
        message = self._assert_fails(
            lambda: harness.fixture_stationary(settle_s=0.5, observe_s=0.5),
            fail_after=60)
        self.assertIn("observe step 0", message)

    def test_stationary_rejects_stalled_time(self):
        message = self._assert_fails(
            lambda: harness.fixture_stationary(settle_s=0.5, observe_s=0.5),
            advances=False)
        self.assertIn("simulation time advanced", message)

    def test_healthy_fake_passes_cost(self):
        make, _, _ = self._patched()
        with make, mock.patch.object(harness, "init_airborne"):
            result = harness.fixture_cost(steps=10, dt_s=self.DT_S, runs=1)
        self.assertEqual(result["runs"], 1)

    def test_cost_rejects_false_run(self):
        with mock.patch.object(harness, "init_airborne"):
            message = self._assert_fails(
                lambda: harness.fixture_cost(steps=10, dt_s=self.DT_S, runs=1),
                run_result=False)
        self.assertIn("cost run-only step 0", message)

    def test_cost_rejects_stalled_time(self):
        with mock.patch.object(harness, "init_airborne"):
            message = self._assert_fails(
                lambda: harness.fixture_cost(steps=10, dt_s=self.DT_S, runs=1),
                advances=False)
        self.assertIn("cost run-only: simulation time advanced", message)


@unittest.skipUnless(HAVE_JSBSIM, "jsbsim package not importable")
class EngineTests(unittest.TestCase):
    STEPS = 600
    DT_S = 1.0 / 120.0

    def test_rejects_invalid_step(self):
        for bad in (0.0, -0.01, math.nan):
            with self.assertRaises(ValueError):
                harness.make_fdm(bad)

    def test_fresh_instances_bit_identical(self):
        a = harness.determinism_digest(self.STEPS, self.DT_S)
        b = harness.determinism_digest(self.STEPS, self.DT_S)
        self.assertEqual(a, b)

    def test_initial_state_change_changes_digest(self):
        """Guard against a vacuous digest that ignores the initial state."""
        a = harness.determinism_digest(self.STEPS, self.DT_S)
        fdm = harness.make_fdm(self.DT_S)
        harness.init_airborne(fdm, alt_msl_m=harness.IC_ALT_MSL_M + 1.0)
        self.assertNotEqual(a, harness.run_hashed(fdm, self.STEPS, self.DT_S))

    def test_input_change_changes_digest(self):
        """Guard against a digest that ignores control inputs."""
        a = harness.determinism_digest(self.STEPS, self.DT_S)

        def nudged(t_s):
            inputs = harness.scripted_inputs(t_s)
            inputs["fcs/elevator-cmd-norm"] += 0.01 * (t_s >= 1.0)
            return inputs

        fdm = harness.make_fdm(self.DT_S)
        harness.init_airborne(fdm)
        self.assertNotEqual(a, harness.run_hashed(fdm, self.STEPS, self.DT_S, nudged))

    def test_child_process_and_reset_identical(self):
        result = harness.fixture_determinism(self.STEPS, self.DT_S)
        self.assertEqual(result["fresh_a"], result["child_process"])
        self.assertEqual(result["fresh_a"], result["after_reset"])
        self.assertTrue(result["fresh_identical"])
        self.assertTrue(result["reset_identical"])

    def test_cli_stdout_is_json_and_cwd_unchanged(self):
        script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "harness.py")
        with tempfile.TemporaryDirectory() as cwd:
            done = subprocess.run([sys.executable, script, "all"], cwd=cwd,
                                  capture_output=True, text=True, check=True)
            self.assertEqual(os.listdir(cwd), [])
        results = json.loads(done.stdout)
        self.assertTrue(results["F1_determinism"]["fresh_identical"])
        self.assertEqual(results["F4_cost"]["runs"], 3)

    def test_fixed_step_time_is_step_indexed(self):
        fdm = harness.make_fdm(self.DT_S)
        harness.init_airborne(fdm)
        for _ in range(240):
            fdm.run()
        self.assertAlmostEqual(fdm["simulation/sim-time-sec"], 2.0, places=9)

    def test_ic_set_in_si(self):
        fdm = harness.make_fdm(self.DT_S)
        harness.init_airborne(fdm)
        self.assertAlmostEqual(harness.ft_to_m(fdm["position/h-sl-ft"]),
                               harness.IC_ALT_MSL_M, places=3)
        self.assertAlmostEqual(harness.ft_to_m(fdm["velocities/vtrue-fps"]),
                               harness.IC_TAS_MPS, places=2)

    def test_at_rest_stays_at_rest(self):
        result = harness.fixture_stationary(settle_s=5.0, observe_s=5.0)
        self.assertLess(result["horizontal_drift_m"], 0.01)
        self.assertLess(result["max_speed_mps"], 0.001)
        self.assertTrue(result["airborne_trim"]["success"])


if __name__ == "__main__":
    unittest.main()
