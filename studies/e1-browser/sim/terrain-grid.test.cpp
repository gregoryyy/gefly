#include "terrain-grid.h"
#include <cassert>
#include <iostream>
using gefly::TerrainGrid;
int main() {
  const double values[]{0, 0, 0, 100};
  TerrainGrid grid(0, 0, .01, .01, 2, 2, values, 4);
  const auto lower = grid.sample(.0075, .0025), upper = grid.sample(.0025, .0075);
  assert(lower && upper && std::abs(lower->height_m - 25) < 1e-12 && std::abs(upper->height_m - 25) < 1e-12);
  assert(lower->dh_dlon_m == 0 && lower->dh_dlat_m == 10000);
  assert(upper->dh_dlon_m == 10000 && upper->dh_dlat_m == 0);
  assert(grid.sample(.005, .005)->height_m == 50);
  assert(grid.sample(.01, .01)->height_m == 100);
  assert(!grid.sample(-.00001, .005)); assert(!grid.sample(.005, .010001));
  assert(!grid.sample(std::numeric_limits<double>::quiet_NaN(), .005));
  const double flat[]{120, 120, 120, 120};
  TerrainGrid plateau(.1, .8, .11, .81, 2, 2, flat, 4);
  auto p = plateau.sample(.105, .805); assert(p && p->height_m == 120);
  auto normal = gefly::terrainNormal(.105, .805, 6378137, 6356752.314245, *p);
  assert(std::abs(normal[0] - std::cos(.805) * std::cos(.105)) < 1e-12);
  assert(std::abs(normal[2] - std::sin(.805)) < 1e-12);
  auto slope = gefly::terrainNormal(0, 0, 6378137, 6356752.314245, {100, 637823.7, 633553.932729});
  assert(slope[0] > 0 && slope[1] < 0 && slope[2] < 0);
  assert(std::abs(std::hypot(slope[0], slope[1], slope[2]) - 1) < 1e-12);
  for (int mode = 0; mode < 3; ++mode) {
    bool rejected = false;
    try { const double bad[]{0, 0, 0, std::numeric_limits<double>::infinity()};
      TerrainGrid invalid(0, 0, mode == 0 ? 0 : .01, .01, 2, 2, mode == 1 ? bad : values, mode == 2 ? 3 : 4);
    } catch (const std::invalid_argument&) { rejected = true; }
    assert(rejected);
  }
  auto fine = std::make_shared<const TerrainGrid>(0, 0, .01, .01, 2, 2, values, 4);
  auto coarse = std::make_shared<const TerrainGrid>(0, 0, .02, .02, 2, 2, flat, 4);
  gefly::TerrainAtlas atlas(fine); atlas.set(1, coarse);
  assert(atlas.sample(.005, .005)->height_m == 50);
  assert(atlas.sample(.015, .015)->height_m == 120);
  const double edge = .0001;
  const auto feather = atlas.sample(edge, .005);
  const double band = .02 * 3.14159265358979323846 / 180;
  const double t = edge / band, w = t*t*(3-2*t), dw = 6*t*(1-t)/band;
  auto a = fine->sample(edge, .005); auto b = coarse->sample(edge, .005);
  assert(std::abs(feather->height_m - (b->height_m + w * (a->height_m-b->height_m))) < 1e-10);
  assert(std::abs(feather->dh_dlon_m - (b->dh_dlon_m + w*(a->dh_dlon_m-b->dh_dlon_m) + (a->height_m-b->height_m)*dw)) < 1e-6);
  atlas.remove(1); assert(!atlas.contains(.015, .015));
  std::cout << "PASS terrain triangular interpolation, cell gradients, ECEF normals, boundaries and malformed grids\n";
}
