interface MapZoomShortcutsOptions {
  root: HTMLElement;
  isOpen(): boolean;
  onZoom(direction: 1 | -1): void;
}

/** The open flight map owns zoom keys even when focus remains in the flying view. */
export function createMapZoomShortcuts(options: MapZoomShortcutsOptions): { dispose(): void } {
  const { root } = options;
  const document = root.ownerDocument;
  const listenerOptions = { capture: true };
  let disposed = false;

  function onKey(event: KeyboardEvent): void {
    if (disposed || event.defaultPrevented || !options.isOpen()
      || event.ctrlKey || event.metaKey || event.altKey) return;
    // Match characters rather than the Equal code: German Shift+Digit0 is '='.
    const direction = event.key === '=' || event.key === '+' || event.code === 'NumpadAdd' ? 1
      : event.key === '-' || event.code === 'NumpadSubtract' ? -1 : null;
    if (direction === null) return;
    const ElementClass = document.defaultView?.Element;
    if ((ElementClass && event.target instanceof ElementClass && event.target.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"])'))
      || document.querySelector('dialog[open]') || root.querySelector('.top-menu[open]')
      || [...document.querySelectorAll<HTMLElement>('.cesium-credit-lightbox-overlay')]
        .some(popup => typeof popup.checkVisibility === 'function' ? popup.checkVisibility() : popup.getClientRects().length > 0)) return;

    // Repeats still belong to the map; do not leak Digit0 to the throttle handler.
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!event.repeat) options.onZoom(direction);
  }

  document.addEventListener('keydown', onKey, listenerOptions);
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      document.removeEventListener('keydown', onKey, listenerOptions);
    },
  };
}
