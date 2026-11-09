"""Synthetic table arithmetic fixtures; not source aircraft acceptance."""
import importlib.util
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET

spec = importlib.util.spec_from_file_location('flap_source_checks', Path(__file__).with_name('flap-effectiveness-source.py'))
source = importlib.util.module_from_spec(spec)
spec.loader.exec_module(source)


class FlapSourceTables(unittest.TestCase):
    def test_linear_interpolation_and_endpoint_clamping(self):
        points = [(0, 4), (10, 8), (20, 2)]
        self.assertEqual(source.interpolate(points, 5), 6)
        self.assertEqual(source.interpolate(points, -1), 4)
        self.assertEqual(source.interpolate(points, 25), 2)

    def test_bilinear_table_uses_rows_and_columns(self):
        table = ET.fromstring('<tableData>0 10\n0 0 10\n20 40 50</tableData>')
        self.assertEqual(source.table_2d(table, 10, 5), 25)
        self.assertEqual(source.table_2d(table, -5, 5), 5)
        self.assertEqual(source.table_2d(table, 25, 15), 50)

    def test_invalid_order_shape_and_nonfinite_values_rejected(self):
        with self.assertRaises(ValueError):
            source.interpolate([(0, 0), (0, 2)], 0)
        with self.assertRaises(ValueError):
            source.interpolate([(0, 0), (1, 2)], float('nan'))
        with self.assertRaises(ValueError):
            source.table_2d(ET.fromstring('<tableData>0 10\n0 1</tableData>'), 0, 0)
        with self.assertRaises(ValueError):
            source.rows(ET.fromstring('<tableData>0 NaN\n1 2</tableData>'))


if __name__ == '__main__':
    unittest.main()
