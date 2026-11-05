/** Loading policy only: measured spherical ground motion, never aircraft guidance. */
const R = 6371000, LIMIT_LAT = 89.5 * Math.PI / 180;
const wrap = angle => ((angle + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
const valid = state => state && [state.t_s, state.lat_rad, state.lon_rad].every(Number.isFinite)
  && state.t_s >= 0 && Math.abs(state.lat_rad) < LIMIT_LAT && Math.abs(state.lon_rad) <= Math.PI;
const rates = [1, 1.5, 2, 5, 10];
export function createTerrainPrediction() {
  let previous = null, velocity = null;
  function project(state, rate) {
    if (!velocity) return null;
    const speed = Math.hypot(velocity.north_mps, velocity.east_mps);
    const distance_m = Math.min(8000, speed * 20 * rate), arc = distance_m / R;
    const bearing = Math.atan2(velocity.east_mps, velocity.north_mps), lat = state.lat_rad;
    const targetLat = Math.asin(Math.max(-1, Math.min(1,
      Math.sin(lat) * Math.cos(arc) + Math.cos(lat) * Math.sin(arc) * Math.cos(bearing))));
    const targetLon = wrap(state.lon_rad + Math.atan2(Math.sin(bearing) * Math.sin(arc) * Math.cos(lat),
      Math.cos(arc) - Math.sin(lat) * Math.sin(targetLat)));
    return Math.abs(targetLat) < LIMIT_LAT ? Object.freeze({ lat_rad: targetLat, lon_rad: targetLon,
      distance_m, ...velocity }) : null;
  }
  return {
    reset() { previous = null; velocity = null; },
    update(state, rate = 1) {
      if (!valid(state) || !rates.includes(rate)) { this.reset(); return null; }
      const current = { t_s: state.t_s, lat_rad: state.lat_rad, lon_rad: state.lon_rad };
      if (!previous) { previous = current; return null; }
      const dt = current.t_s - previous.t_s;
      if (dt === 0 && current.lat_rad === previous.lat_rad && current.lon_rad === previous.lon_rad) return project(current, rate);
      if (dt <= 0 || dt > 30) { previous = current; velocity = null; return null; }
      const dlat = previous.lat_rad - current.lat_rad, dlon = wrap(previous.lon_rad - current.lon_rad);
      const hav = Math.sin(dlat / 2) ** 2 + Math.cos(previous.lat_rad) * Math.cos(current.lat_rad) * Math.sin(dlon / 2) ** 2;
      const speed = 2 * R * Math.asin(Math.sqrt(Math.max(0, Math.min(1, hav)))) / dt;
      const bearing = Math.atan2(Math.sin(dlon) * Math.cos(previous.lat_rad),
        Math.cos(current.lat_rad) * Math.sin(previous.lat_rad)
        - Math.sin(current.lat_rad) * Math.cos(previous.lat_rad) * Math.cos(dlon)) + Math.PI;
      previous = current;
      if (speed < 2 || speed > 200) { velocity = null; return null; }
      velocity = { north_mps: speed * Math.cos(bearing), east_mps: speed * Math.sin(bearing) };
      return project(current, rate);
    },
  };
}
