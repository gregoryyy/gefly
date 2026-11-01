"""Tests for the E1 JSBSim study harness.

Unit-conversion tests need only the standard library. Engine tests skip cleanly
when the ``jsbsim`` package is not importable (the repository CI installs none).
"""

from __future__ import annotations

import importlib.util
import math
import os
import sys
import unittest

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

    def test_pack_is_bitwise(self):
        self.assertNotEqual(harness.pack([0.0]), harness.pack([-0.0]))
        self.assertEqual(len(harness.pack([1.0, 2.0])), 16)


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

    def test_input_change_changes_digest(self):
        """Guard against a vacuous digest that ignores state."""
        a = harness.determinism_digest(self.STEPS, self.DT_S)
        fdm = harness.make_fdm(self.DT_S)
        harness.init_airborne(fdm, alt_msl_m=harness.IC_ALT_MSL_M + 1.0)
        self.assertNotEqual(a, harness.run_hashed(fdm, self.STEPS, self.DT_S))

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
