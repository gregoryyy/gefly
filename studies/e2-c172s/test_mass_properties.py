# SPDX-License-Identifier: GPL-3.0-or-later
"""Synthetic reference cases for the component build-up, not aircraft evidence."""

import copy
import math
import unittest

from mass_properties import calculate_mass_properties


def component(identifier="a", mass=1.0, cg=None, inertia=None):
    return {"id": identifier, "mass_kg": mass, "cg_m": cg or [0.0, 0.0, 0.0],
            "inertia_cg_kg_m2": inertia or [[0.0] * 3 for _ in range(3)]}


class MassPropertiesTests(unittest.TestCase):
    def assertTensorAlmostEqual(self, observed, expected):
        for row, reference in zip(observed, expected):
            for value, target in zip(row, reference):
                self.assertAlmostEqual(value, target, places=10)

    def test_single_rectangular_block_keeps_own_cg_tensor(self):
        # Homogeneous block mass 12, side lengths 2, 4, 6: Ixx=m*(4²+6²)/12.
        inertia = [[52.0, 0.0, 0.0], [0.0, 40.0, 0.0], [0.0, 0.0, 20.0]]
        source = [component(mass=12, cg=[3, -5, 8], inertia=inertia)]
        before = copy.deepcopy(source)
        result = calculate_mass_properties(source)
        self.assertEqual(result, {"mass_kg": 12, "cg_m": [3, -5, 8],
                                  "inertia_cg_kg_m2": inertia})
        self.assertEqual(source, before)

    def test_two_equal_point_masses_on_x_axis(self):
        result = calculate_mass_properties([
            component("left", 3, [-2, 0, 0]), component("right", 3, [2, 0, 0])])
        self.assertEqual(result["mass_kg"], 6)
        self.assertEqual(result["cg_m"], [0, 0, 0])
        self.assertEqual(result["inertia_cg_kg_m2"],
                         [[0, 0, 0], [0, 24, 0], [0, 0, 24]])

    def test_unequal_masses_and_off_diagonal_signs(self):
        # Two point masses: reduced mass is 3/4, separation is (4, 8, 12).
        result = calculate_mass_properties([
            component("a", 1, [0, 0, 0]), component("b", 3, [4, 8, 12])])
        self.assertEqual(result["cg_m"], [3, 6, 9])
        self.assertEqual(result["inertia_cg_kg_m2"],
                         [[156, -24, -36], [-24, 120, -72], [-36, -72, 60]])

    def test_translation_and_component_order_do_not_change_tensor(self):
        source = [component("a", 1, [-2, 3, 1]), component("b", 4, [8, -3, 5])]
        original = calculate_mass_properties(source)
        shift = [100, -50, 32]
        translated = copy.deepcopy(source)
        for item in translated:
            item["cg_m"] = [value + delta for value, delta in zip(item["cg_m"], shift)]
        result = calculate_mass_properties(translated[::-1])
        for actual, previous, delta in zip(result["cg_m"], original["cg_m"], shift):
            self.assertAlmostEqual(actual, previous + delta)
        self.assertTensorAlmostEqual(result["inertia_cg_kg_m2"],
                                     original["inertia_cg_kg_m2"])

    def test_small_distant_component_cg_is_preserved_in_either_input_order(self):
        source = [component("light", 1, [1e16, 0, 0]),
                  component("heavy", 1e16, [0, 0, 0])]
        forward = calculate_mass_properties(source)
        reverse = calculate_mass_properties(source[::-1])
        self.assertEqual(forward["cg_m"], [1, 0, 0])
        self.assertEqual(forward, reverse)

    def test_equal_mass_reference_tie_break_is_independent_of_input_order(self):
        source = [component("left", 1, [-1e16, 0, 0]),
                  component("centre", 1, [0, 0, 0]),
                  component("right", 1, [1e16, 0, 0])]
        forward = calculate_mass_properties(source)
        reverse = calculate_mass_properties(source[::-1])
        self.assertEqual(forward, reverse)
        self.assertEqual(forward["cg_m"], [0, 0, 0])

    def test_uniform_mass_and_length_scaling(self):
        source = [component("a", 2, [-1, 3, 0]), component("b", 5, [2, 0, 4])]
        original = calculate_mass_properties(source)
        for item in source:
            item["mass_kg"] *= 7
            item["cg_m"] = [value * 3 for value in item["cg_m"]]
        result = calculate_mass_properties(source)
        self.assertEqual(result["mass_kg"], 7 * original["mass_kg"])
        self.assertTensorAlmostEqual(result["inertia_cg_kg_m2"],
                                     [[63 * v for v in row]
                                      for row in original["inertia_cg_kg_m2"]])

    def test_intrinsic_tensors_add_for_coincident_components(self):
        first = [[2, -1, 0], [-1, 2, 0], [0, 0, 4]]  # rotated thin rod plus point distribution
        second = [[3, 0, 0], [0, 3, 0], [0, 0, 3]]
        result = calculate_mass_properties([component("a", inertia=first),
                                            component("b", inertia=second)])
        self.assertEqual(result["inertia_cg_kg_m2"],
                         [[5, -1, 0], [-1, 5, 0], [0, 0, 7]])

    def test_empty_malformed_unknown_and_duplicate_fields_rejected(self):
        bad_records = [None, [], {}, [None], [component(), component()],
                       [dict(component(), surprise=0)]]
        missing = component()
        del missing["id"]
        bad_records.append([missing])
        for bad in bad_records:
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                calculate_mass_properties(bad)

    def test_invalid_masses_and_coordinates_rejected(self):
        for value in [0, -1, True, "1", math.nan, math.inf, 10**400]:
            with self.subTest(mass=value), self.assertRaises(ValueError):
                calculate_mass_properties([component(mass=value)])
        for value in [True, math.nan, -math.inf, "2"]:
            with self.subTest(coordinate=value), self.assertRaises(ValueError):
                calculate_mass_properties([component(cg=[0, value, 0])])
        for value in [[1, 2], (1, 2, 3), "123"]:
            bad = component()
            bad["cg_m"] = value
            with self.subTest(cg=value), self.assertRaises(ValueError):
                calculate_mass_properties([bad])

    def test_unphysical_symmetric_and_asymmetric_tensors_rejected(self):
        tensors = [
            [[1, 0, 0], [0, 1, 0], [0, 0, 3]],  # PSD but violates triangle inequality
            [[-1, 0, 0], [0, 1, 0], [0, 0, 1]],
            [[1, 0.5, 0], [0, 1, 0], [0, 0, 1]],
            [[1, 1e-7, 0], [1e-7, 1, 0], [0, 0, 0]],  # negative eigenvalue near rank loss
            [[1, math.nan, 0], [math.nan, 1, 0], [0, 0, 1]],
            [[True, 0, 0], [0, 1, 0], [0, 0, 1]],
            [[1, 0], [0, 1]],
        ]
        for tensor in tensors:
            with self.subTest(tensor=tensor), self.assertRaises(ValueError):
                calculate_mass_properties([component(inertia=tensor)])

    def test_rotated_linear_body_is_allowed(self):
        # Two point masses along (1,1,1) have a singular tensor; rank loss is valid.
        tensor = [[2, -1, -1], [-1, 2, -1], [-1, -1, 2]]
        result = calculate_mass_properties([component(inertia=tensor)])
        self.assertEqual(result["inertia_cg_kg_m2"], tensor)

    def test_coupled_nonphysical_tensor_rejected_even_with_valid_diagonals(self):
        # Principal inertia triangle tests on diagonals alone cannot catch this.
        with self.assertRaises(ValueError):
            calculate_mass_properties([component(inertia=[
                [2, -0.9, -0.9], [-0.9, 2, 0.9], [-0.9, 0.9, 2]])])

    def test_tiny_unphysical_tensor_cannot_hide_under_absolute_tolerance(self):
        with self.assertRaises(ValueError):
            calculate_mass_properties([component(inertia=[
                [1e-100, 0, 0], [0, 1e-100, 0], [0, 0, 3e-100]])])

    def test_non_finite_intermediate_mass_and_inertia_rejected(self):
        with self.assertRaises(ValueError):
            calculate_mass_properties([component("a", 1e308), component("b", 1e308)])
        with self.assertRaises(ValueError):
            calculate_mass_properties([component("a", cg=[1e200, 0, 0]),
                                       component("b", cg=[-1e200, 0, 0])])

    def test_coincident_bodies_at_large_position_do_not_gain_spurious_inertia(self):
        result = calculate_mass_properties([
            component("a", 1, [1e200, 0, 0]),
            component("b", 2, [1e200, 0, 0]),
            component("c", 7, [1e200, 0, 0])])
        self.assertEqual(result["cg_m"], [1e200, 0, 0])
        self.assertEqual(result["inertia_cg_kg_m2"], [[0, 0, 0]] * 3)

    def test_weighted_average_avoids_unnecessary_mass_times_position_overflow(self):
        result = calculate_mass_properties([component("a", 1e200, [1e200, 0, 0])])
        self.assertEqual(result["cg_m"], [1e200, 0, 0])
        self.assertEqual(result["inertia_cg_kg_m2"], [[0, 0, 0]] * 3)


if __name__ == "__main__":
    unittest.main()
