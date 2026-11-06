export interface CameraReturnPose {
  yaw_rad: number;
  pitch_rad: number;
  distance_m?: number;
}

export interface CameraReturnSample {
  pose: CameraReturnPose;
  done: boolean;
}

export interface CameraReturnOptions {
  from: Readonly<CameraReturnPose>;
  to: Readonly<CameraReturnPose>;
  startedAt_ms: number;
  duration_ms?: number;
}

/** Presentation timing only; sampling never calls the renderer or simulator. */
export const CAMERA_RETURN_DURATION_MS = 700;

function copyPose(pose: Readonly<CameraReturnPose>): CameraReturnPose {
  return {
    yaw_rad: pose.yaw_rad,
    pitch_rad: pose.pitch_rad,
    ...(pose.distance_m === undefined ? {} : { distance_m: pose.distance_m }),
  };
}

function validPose(pose: Readonly<CameraReturnPose>): boolean {
  return !!pose && Number.isFinite(pose.yaw_rad) && Number.isFinite(pose.pitch_rad)
    && Math.abs(pose.pitch_rad) <= Math.PI / 2
    && (pose.distance_m === undefined || Number.isFinite(pose.distance_m) && pose.distance_m > 0);
}

/**
 * A wall-time camera transition with no timer, storage or physics dependency.
 * Intermediate yaw takes the shortest circular arc, pitch eases linearly and
 * radius eases in logarithmic space. The endpoint is the exact supplied pose.
 * A cancelled transition holds its last sampled pose; restart from that pose.
 */
export function createCameraReturn(options: CameraReturnOptions): {
  sample(now_ms: number): CameraReturnSample;
  cancel(): void;
} {
  const { from, to, startedAt_ms } = options;
  const duration_ms = options.duration_ms ?? CAMERA_RETURN_DURATION_MS;
  if (!validPose(from) || !validPose(to)
    || (from.distance_m === undefined) !== (to.distance_m === undefined)
    || !Number.isFinite(startedAt_ms) || !Number.isFinite(duration_ms) || duration_ms < 0) {
    throw new RangeError('Camera return requires finite poses, matching positive radii and nonnegative timing');
  }
  const start = copyPose(from), target = copyPose(to);
  // Reducing each angle first avoids overflowing a subtraction of finite angles.
  const startYaw = Math.atan2(Math.sin(start.yaw_rad), Math.cos(start.yaw_rad));
  const targetYaw = Math.atan2(Math.sin(target.yaw_rad), Math.cos(target.yaw_rad));
  const yawDelta = Math.atan2(Math.sin(targetYaw - startYaw), Math.cos(targetYaw - startYaw));
  const logStart = start.distance_m === undefined ? null : Math.log(start.distance_m);
  const logTarget = target.distance_m === undefined ? null : Math.log(target.distance_m);
  let progress = duration_ms === 0 ? 1 : 0;
  let lastPose = copyPose(progress === 1 ? target : start);
  let finished = progress === 1;

  return {
    sample(now_ms) {
      if (!finished && Number.isFinite(now_ms)) {
        progress = Math.max(progress, Math.max(0, Math.min(1, (now_ms - startedAt_ms) / duration_ms)));
        if (progress === 1) {
          lastPose = copyPose(target);
          finished = true;
        } else if (progress > 0) {
          // Quintic easing has zero endpoint velocity and acceleration.
          const eased = progress ** 3 * (10 + progress * (-15 + 6 * progress));
          const yaw = startYaw + yawDelta * eased;
          lastPose = {
            yaw_rad: Math.atan2(Math.sin(yaw), Math.cos(yaw)),
            pitch_rad: start.pitch_rad * (1 - eased) + target.pitch_rad * eased,
          };
          if (logStart !== null && logTarget !== null) {
            const lower = Math.min(start.distance_m!, target.distance_m!);
            const upper = Math.max(start.distance_m!, target.distance_m!);
            // Rounding at the extremes of finite Number radii cannot leave the
            // endpoint interval, overflow to Infinity or underflow to zero.
            lastPose.distance_m = Math.max(lower, Math.min(upper,
              Math.exp(logStart * (1 - eased) + logTarget * eased)));
          }
        }
      }
      return { pose: copyPose(lastPose), done: finished };
    },
    cancel() { finished = true; },
  };
}
