export type PointerYokeMode = 'off' | 'yoke' | 'look';

interface PointerYokeOptions {
  element: HTMLElement;
  onYoke: (x: number, y: number) => void;
  onLook: (yaw_rad: number, pitch_rad: number) => void;
  onMode: (mode: PointerYokeMode) => void;
  enabled: () => boolean;
  lookOnly?: () => boolean;
  /** Fixed scene-center yoke and persistent drag look; opt-in. */
  centered?: () => boolean;
}

const HOLD_MS = 250;
const YOKE_TRAVEL_PX = 150;
const LOOK_RAD_PER_PX = 0.004;
const MAX_LOOK_PITCH_RAD = 70 * Math.PI / 180;
const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

/** Scene-only click/hold gestures; legacy relative or opt-in fixed-center yoke. */
export function createPointerYoke(options: PointerYokeOptions): {
  cancel(): void;
  reset(): void;
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
  let pressLookOnly = false, pressLookYaw = 0, pressLookPitch = 0;
  let anchorX = 0, anchorY = 0;
  let pressX = 0, pressY = 0, lastX = 0, lastY = 0;
  let mode: PointerYokeMode = 'off';
  let yokeX = 0, yokeY = 0, lookYaw = 0, lookPitch = 0;
  let holdTimer: ReturnType<typeof setTimeout> | undefined;
  let neutralUntilMoveFrom: { x: number; y: number } | undefined;

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
    neutralUntilMoveFrom = undefined;
    setYoke(0, 0);
    if (!options.centered?.()) setLook(0, 0);
    setMode('off');
  }
  function reset(): void {
    if (disposed) return;
    cancel(); setLook(0, 0);
  }
  function lookAtPointer(): void {
    setLook(clamp(pressLookYaw + (lastX - pressX) * LOOK_RAD_PER_PX, Math.PI),
      clamp(pressLookPitch + (pressY - lastY) * LOOK_RAD_PER_PX, MAX_LOOK_PITCH_RAD));
  }
  function suspendOutside(): void {
    // Leaving the scene is not a request to switch off click-toggled yoke.
    // Abort an unfinished click/hold without toggling or moving its anchor.
    if (activePointer !== null) {
      clearPress(); yokeActive = previousYokeActive;
    }
    setYoke(0, 0); setMode(yokeActive ? 'yoke' : 'off');
  }
  function inside(event: PointerEvent): boolean {
    const rect = element.getBoundingClientRect();
    return event.clientX >= rect.left && event.clientX <= rect.right
      && event.clientY >= rect.top && event.clientY <= rect.bottom;
  }
  function down(event: PointerEvent): void {
    if (disposed || !options.enabled() || event.button !== 0 || event.isPrimary === false || activePointer !== null) return;
    event.preventDefault(); element.focus({ preventScroll: true });
    pressLookOnly = options.lookOnly?.() === true;
    previousYokeActive = !pressLookOnly && yokeActive;
    const persistentLook = pressLookOnly || options.centered?.() === true;
    pressLookYaw = persistentLook ? lookYaw : 0;
    pressLookPitch = persistentLook ? lookPitch : 0;
    neutralUntilMoveFrom = undefined;
    if (pressLookOnly) { yokeActive = false; setMode('off'); }
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
      else if (!inside(event)) suspendOutside();
      return;
    }
    if (options.lookOnly?.() || !yokeActive || event.isPrimary === false) return;
    if (!inside(event)) { suspendOutside(); return; }
    if (options.centered?.()) {
      // A click/drag release cannot introduce a control jump at the drop point.
      // Pointer entry is authoritative even if its coordinates match the release.
      if (event.type === 'pointermove' && neutralUntilMoveFrom
        && event.clientX === neutralUntilMoveFrom.x && event.clientY === neutralUntilMoveFrom.y) return;
      neutralUntilMoveFrom = undefined;
      const rect = element.getBoundingClientRect();
      const centerX = (rect.left + rect.right) / 2, centerY = (rect.top + rect.bottom) / 2;
      setYoke(clamp((event.clientX - centerX) / YOKE_TRAVEL_PX, 1),
        clamp((centerY - event.clientY) / YOKE_TRAVEL_PX, 1));
    } else {
      setYoke(clamp((event.clientX - anchorX) / YOKE_TRAVEL_PX, 1),
        clamp((anchorY - event.clientY) / YOKE_TRAVEL_PX, 1));
    }
  }
  function up(event: PointerEvent): void {
    if (disposed || event.pointerId !== activePointer) return;
    event.preventDefault();
    if (!options.enabled()) { cancel(); return; }
    const wasLooking = looking;
    clearPress(); looking = false;
    yokeActive = !pressLookOnly && (wasLooking ? previousYokeActive : !previousYokeActive);
    // A look gesture borrows the pointer, not the yoke's reference position.
    // Only a short click establishes a new midpoint when toggling the yoke.
    if (!wasLooking && !pressLookOnly && !options.centered?.()) {
      anchorX = event.clientX; anchorY = event.clientY;
    }
    setYoke(0, 0);
    // Review and fixed-center look retain their last orientation between drags.
    if (!pressLookOnly && !options.centered?.()) setLook(0, 0);
    if (options.centered?.()) neutralUntilMoveFrom = { x: event.clientX, y: event.clientY };
    setMode(yokeActive ? 'yoke' : 'off');
  }
  function interrupted(event: PointerEvent): void {
    if (event.pointerId === activePointer) cancel();
  }
  function leave(): void {
    if (!options.enabled()) { cancel(); return; }
    if (!looking) suspendOutside();
  }
  function key(event: KeyboardEvent): void {
    if (event.code === 'Escape') { event.preventDefault(); reset(); }
  }
  function visibility(): void { if (document.hidden) cancel(); }

  element.addEventListener('pointerdown', down);
  element.addEventListener('pointermove', move);
  element.addEventListener('pointerenter', move);
  element.addEventListener('pointerup', up);
  element.addEventListener('pointercancel', interrupted);
  element.addEventListener('lostpointercapture', interrupted);
  element.addEventListener('pointerleave', leave);
  element.addEventListener('keydown', key);
  window?.addEventListener('blur', cancel);
  document.addEventListener('visibilitychange', visibility);

  return {
    cancel, reset,
    dispose() {
      if (disposed) return;
      reset(); disposed = true;
      element.removeEventListener('pointerdown', down);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerenter', move);
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
