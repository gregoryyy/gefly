export type PointerYokeMode = 'off' | 'yoke' | 'look';

interface PointerYokeOptions {
  element: HTMLElement;
  onYoke: (x: number, y: number) => void;
  onLook: (yaw_rad: number, pitch_rad: number) => void;
  onMode: (mode: PointerYokeMode) => void;
  enabled: () => boolean;
}

const HOLD_MS = 250;
const YOKE_TRAVEL_PX = 150;
const LOOK_RAD_PER_PX = 0.004;
const MAX_LOOK_PITCH_RAD = 70 * Math.PI / 180;
const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

/** Scene-only relative yoke and temporary look gestures; never requests pointer lock. */
export function createPointerYoke(options: PointerYokeOptions): {
  cancel(): void;
  dispose(): void;
} {
  const { element } = options;
  const document = element.ownerDocument;
  const window = document.defaultView;
  let disposed = false;
  let yokeActive = false;
  let looking = false;
  let activePointer: number | null = null;
  let previousYokeActive = false;
  let anchorX = 0, anchorY = 0;
  let pressX = 0, pressY = 0, lastX = 0, lastY = 0;
  let mode: PointerYokeMode = 'off';
  let yokeX = 0, yokeY = 0, lookYaw = 0, lookPitch = 0;
  let holdTimer: ReturnType<typeof setTimeout> | undefined;

  function setYoke(x: number, y: number): void {
    if (disposed || (x === yokeX && y === yokeY)) return;
    yokeX = x; yokeY = y;
    options.onYoke(x, y);
  }
  function setLook(yaw: number, pitch: number): void {
    if (disposed || (yaw === lookYaw && pitch === lookPitch)) return;
    lookYaw = yaw; lookPitch = pitch;
    options.onLook(yaw, pitch);
  }
  function setMode(next: PointerYokeMode): void {
    if (disposed || next === mode) return;
    mode = next; options.onMode(next);
  }
  function clearPress(): void {
    clearTimeout(holdTimer); holdTimer = undefined;
    // Clear identity before releasing capture: its normal lostcapture event must
    // not cancel the newly restored yoke mode.
    const pointer = activePointer; activePointer = null;
    if (pointer !== null && element.hasPointerCapture(pointer)) element.releasePointerCapture(pointer);
  }
  function cancel(): void {
    if (disposed) return;
    clearPress(); looking = false; yokeActive = false;
    setYoke(0, 0); setLook(0, 0); setMode('off');
  }
  function lookAtPointer(): void {
    setLook(clamp((lastX - pressX) * LOOK_RAD_PER_PX, Math.PI),
      clamp((pressY - lastY) * LOOK_RAD_PER_PX, MAX_LOOK_PITCH_RAD));
  }
  function down(event: PointerEvent): void {
    if (disposed || !options.enabled() || event.button !== 0 || event.isPrimary === false || activePointer !== null) return;
    event.preventDefault(); element.focus({ preventScroll: true });
    previousYokeActive = yokeActive;
    pressX = lastX = event.clientX; pressY = lastY = event.clientY;
    activePointer = event.pointerId; looking = false;
    setYoke(0, 0);
    element.setPointerCapture(event.pointerId);
    holdTimer = setTimeout(() => {
      holdTimer = undefined;
      if (disposed || activePointer === null) return;
      if (!options.enabled()) { cancel(); return; }
      looking = true; setMode('look'); lookAtPointer();
    }, HOLD_MS);
  }
  function move(event: PointerEvent): void {
    if (disposed) return;
    if (!options.enabled()) { cancel(); return; }
    if (activePointer !== null) {
      if (event.pointerId !== activePointer) return;
      lastX = event.clientX; lastY = event.clientY;
      if (looking) { event.preventDefault(); lookAtPointer(); }
      else {
        const rect = element.getBoundingClientRect();
        if (lastX < rect.left || lastX > rect.right || lastY < rect.top || lastY > rect.bottom) cancel();
      }
      return;
    }
    if (!yokeActive || event.isPrimary === false) return;
    setYoke(clamp((event.clientX - anchorX) / YOKE_TRAVEL_PX, 1),
      clamp((anchorY - event.clientY) / YOKE_TRAVEL_PX, 1));
  }
  function up(event: PointerEvent): void {
    if (disposed || event.pointerId !== activePointer) return;
    event.preventDefault();
    if (!options.enabled()) { cancel(); return; }
    const wasLooking = looking;
    clearPress(); looking = false;
    yokeActive = wasLooking ? previousYokeActive : !previousYokeActive;
    anchorX = event.clientX; anchorY = event.clientY;
    setYoke(0, 0); setLook(0, 0); setMode(yokeActive ? 'yoke' : 'off');
  }
  function interrupted(event: PointerEvent): void {
    if (event.pointerId === activePointer) cancel();
  }
  function leave(): void {
    if (!looking) cancel();
  }
  function key(event: KeyboardEvent): void {
    if (event.code === 'Escape') { event.preventDefault(); cancel(); }
  }
  function visibility(): void { if (document.hidden) cancel(); }

  element.addEventListener('pointerdown', down);
  element.addEventListener('pointermove', move);
  element.addEventListener('pointerup', up);
  element.addEventListener('pointercancel', interrupted);
  element.addEventListener('lostpointercapture', interrupted);
  element.addEventListener('pointerleave', leave);
  element.addEventListener('keydown', key);
  window?.addEventListener('blur', cancel);
  document.addEventListener('visibilitychange', visibility);

  return {
    cancel,
    dispose() {
      if (disposed) return;
      cancel(); disposed = true;
      element.removeEventListener('pointerdown', down);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', up);
      element.removeEventListener('pointercancel', interrupted);
      element.removeEventListener('lostpointercapture', interrupted);
      element.removeEventListener('pointerleave', leave);
      element.removeEventListener('keydown', key);
      window?.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', visibility);
    },
  };
}
