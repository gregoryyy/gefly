/** Suppress AP-inhibited keyboard holds until physical release, including repeats. */
export function createApKeyboardGuard() {
  const blocked = new Set<string>();
  const active = new Set<string>();
  return {
    press(id: string, inhibited: boolean, repeat = false): boolean {
      // A keyup can be lost on blur; a later repeat is not a fresh press.
      if (repeat && !active.has(id)) return false;
      active.add(id);
      if (inhibited) blocked.add(id);
      return !blocked.has(id);
    },
    block(id: string): void { active.add(id); blocked.add(id); },
    blockActive(): void { for (const id of active) blocked.add(id); },
    release(id: string): void { active.delete(id); blocked.delete(id); },
    clear(): void { active.clear(); blocked.clear(); },
  };
}

const protectedFlightKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyW', 'Quote', 'Backslash']);
export function isApProtectedFlightKey(code: string): boolean { return protectedFlightKeys.has(code); }
