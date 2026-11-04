interface FullscreenControlsOptions {
  button: HTMLButtonElement;
  onError(message: string): void;
  /** Native fullscreen state changed, including the browser's Escape action. */
  onChange?(): void;
}

/** Native, presentation-only fullscreen; no CSS substitute or persisted state. */
export function installFullscreenControls(options: FullscreenControlsOptions): () => void {
  const { button } = options;
  const document = button.ownerDocument;
  const root = document.documentElement;
  const supported = document.fullscreenEnabled === true
    && typeof root.requestFullscreen === 'function' && typeof document.exitFullscreen === 'function';
  let disposed = false, busy = false;
  const label = button.querySelector<HTMLElement>('[data-fullscreen-label]');
  button.setAttribute('aria-keyshortcuts', 'F');
  function render(): void {
    if (disposed) return;
    const active = !!document.fullscreenElement;
    const text = active ? 'Exit full screen' : 'Full screen';
    if (label) label.textContent = text;
    button.setAttribute('aria-label', text);
    button.setAttribute('aria-pressed', String(active));
    button.disabled = !supported || busy;
    button.title = supported ? 'F · Toggle native full screen' : 'Native full screen is unavailable in this browser or embedding context.';
  }
  function finish(failed: boolean): void {
    if (disposed) return;
    busy = false; render();
    if (failed) options.onError('Full screen request was not allowed. Try the View menu button or check browser permissions.');
  }
  function toggle(): void {
    if (disposed || !supported || busy || button.disabled) return;
    busy = true; render();
    try {
      // Call before any await/microtask so the browser receives user activation.
      const request = document.fullscreenElement
        ? document.exitFullscreen() : root.requestFullscreen({ navigationUI: 'hide' });
      void Promise.resolve(request).then(() => finish(false), () => finish(true));
    } catch {
      finish(true);
    }
  }
  function click(event: MouseEvent): void {
    if (event.isTrusted) toggle();
  }
  function key(event: KeyboardEvent): void {
    if (!event.isTrusted || event.defaultPrevented || event.code !== 'KeyF' || event.repeat
      || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (document.querySelector('dialog[open], .top-menu[open]')
      || (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])'))) return;
    if (disposed || !supported || busy || button.disabled) return;
    event.preventDefault(); toggle();
  }
  function change(): void {
    if (disposed) return;
    render(); options.onChange?.();
  }
  render();
  button.addEventListener('click', click);
  document.addEventListener('keydown', key, true);
  document.addEventListener('fullscreenchange', change);
  return () => {
    if (disposed) return;
    disposed = true;
    button.removeEventListener('click', click);
    document.removeEventListener('keydown', key, true);
    document.removeEventListener('fullscreenchange', change);
  };
}
