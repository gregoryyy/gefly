#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <limits>
#include <optional>
#include <stdexcept>
#include <vector>

namespace gefly {
struct TerrainSample {
  double height_m;
  double dh_dlon_m;
  double dh_dlat_m;
};

// Geographic nodes: south-to-north rows, west-to-east columns. Heights retain
// their physical datum. SW--NE cell triangles match Cesium HeightmapTerrainData.
class TerrainGrid {
 public:
  static constexpr size_t kMaxPoints = 4 * 1024 * 1024;
  TerrainGrid(double west, double south, double east, double north,
              size_t width, size_t height, const double* values, size_t count)
      : west_(west), south_(south), east_(east), north_(north), width_(width), height_(height) {
    constexpr double pi = 3.141592653589793;
    if (!std::isfinite(west) || !std::isfinite(south) || !std::isfinite(east) || !std::isfinite(north)
        || west < -pi || east > pi || south <= -pi / 2 || north >= pi / 2
        || east <= west || north <= south || width < 2 || height < 2
        || width > kMaxPoints / height || count != width * height || count > kMaxPoints || !values)
      throw std::invalid_argument("Invalid terrain grid");
    values_.assign(values, values + count);
    for (double value : values_) if (!std::isfinite(value)) throw std::invalid_argument("Non-finite terrain node");
  }

  bool contains(double longitude, double latitude) const {
    return std::isfinite(longitude) && std::isfinite(latitude)
      && longitude >= west_ && longitude <= east_ && latitude >= south_ && latitude <= north_;
  }

  std::optional<TerrainSample> sample(double longitude, double latitude) const {
    if (!contains(longitude, latitude)) return std::nullopt;
    const double x = (longitude - west_) / (east_ - west_) * (width_ - 1);
    const double y = (latitude - south_) / (north_ - south_) * (height_ - 1);
    const size_t col = std::min(static_cast<size_t>(x), width_ - 2);
    const size_t row = std::min(static_cast<size_t>(y), height_ - 2);
    const double dx = x - col, dy = y - row;
    const double sw = values_[row * width_ + col], se = values_[row * width_ + col + 1];
    const double nw = values_[(row + 1) * width_ + col], ne = values_[(row + 1) * width_ + col + 1];
    const double gx = dy < dx ? se - sw : ne - nw;
    const double gy = dy < dx ? ne - se : nw - sw;
    const TerrainSample result{sw + dx * gx + dy * gy,
      gx * (width_ - 1) / (east_ - west_), gy * (height_ - 1) / (north_ - south_)};
    if (!std::isfinite(result.height_m) || !std::isfinite(result.dh_dlon_m) || !std::isfinite(result.dh_dlat_m)) return std::nullopt;
    return result;
  }

 private:
  double west_, south_, east_, north_;
  size_t width_, height_;
  std::vector<double> values_;
};

// Outward ECEF normal of the geodetic-height field. The callback still returns
// vertical AGL; JSBSim projects that height onto the strut/normal itself.
inline std::array<double, 3> terrainNormal(double longitude, double latitude,
    double semimajor_m, double semiminor_m, const TerrainSample& sample) {
  const double sp = std::sin(latitude), cp = std::cos(latitude), sl = std::sin(longitude), cl = std::cos(longitude);
  const double eccentricity2 = 1 - (semiminor_m / semimajor_m) * (semiminor_m / semimajor_m);
  const double denom = 1 - eccentricity2 * sp * sp;
  const double n = semimajor_m / std::sqrt(denom);
  const double m = semimajor_m * (1 - eccentricity2) / std::pow(denom, 1.5);
  const double eastSlope = sample.dh_dlon_m / ((n + sample.height_m) * cp);
  const double northSlope = sample.dh_dlat_m / (m + sample.height_m);
  std::array<double, 3> normal{cp * cl + eastSlope * sl + northSlope * sp * cl,
    cp * sl - eastSlope * cl + northSlope * sp * sl, sp - northSlope * cp};
  const double length = std::hypot(normal[0], normal[1], normal[2]);
  if (!std::isfinite(length) || length <= 0) throw std::invalid_argument("Invalid terrain normal");
  for (double& value : normal) value /= length;
  return normal;
}
}  // namespace gefly
