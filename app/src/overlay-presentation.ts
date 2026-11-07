import './overlay-presentation.css';

const panelSelector = '#flight-controls-panel, #practice-map-panel, #flight-data-panel, #stall-awareness-panel';

/** Selected floating panels activate deliberately; immediate panels retain native first gestures. */
export function createOverlayPresentation({ root, title, onActivate, immediatePanels = [] }: {
  root: HTMLElement; title: HTMLElement; onActivate?: () => void; immediatePanels?: readonly string[];
}): { dispose(): void } {
  const immediateSelector = immediatePanels.join(',');
  const isImmediate = (target: Element) => !!immediateSelector && !!target.closest(immediateSelector);
  const observedSelector = [panelSelector, ...immediatePanels].join(',');
  let active: HTMLElement | null = null;
  let interceptedPointer: number | null = null;
  let keyboardNavigation = false;
  const panels = () => Array.from(root.querySelectorAll<HTMLElement>(panelSelector)).filter(panel => !isImmediate(panel));
  const activate = (panel: HTMLElement | null) => {
    if (panel && panel !== active) onActivate?.();
    active = panel;
    for (const item of panels()) item.classList.toggle('overlay-active', item === panel);
  };
  const prepare = () => {
    for (const panel of root.querySelectorAll<HTMLElement>(`${observedSelector}, .floating-overlay, .overlay-active`)) {
      if (isImmediate(panel)) panel.classList.remove('floating-overlay', 'overlay-active');
      else if (panel.matches(panelSelector)) panel.classList.add('floating-overlay');
    }
    if (active && (active.hidden || isImmediate(active) || !root.contains(active))) activate(null);
  };
  const panelFor = (target: EventTarget | null) => target instanceof Element && !isImmediate(target)
    ? target.closest<HTMLElement>(panelSelector) : null;
  const onPointerDown = (event: PointerEvent) => {
    keyboardNavigation = false;
    interceptedPointer = null;
    const panel = panelFor(event.target);
    if (!panel) { activate(null); return; }
    if (panel !== active) {
      activate(panel);
      interceptedPointer = event.pointerId;
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  const onPointerEnd = (event: PointerEvent) => {
    if (interceptedPointer !== event.pointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.type === 'pointercancel') interceptedPointer = null;
    else window.setTimeout(() => { interceptedPointer = null; }, 0);
  };
  const onClick = (event: MouseEvent) => {
    if (interceptedPointer === null) return;
    interceptedPointer = null;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const onWheel = (event: WheelEvent) => {
    const panel = panelFor(event.target);
    if (panel && panel !== active) { event.preventDefault(); event.stopImmediatePropagation(); }
  };
  const onFocus = (event: FocusEvent) => {
    const panel = panelFor(event.target);
    if (panel && keyboardNavigation) activate(panel);
    keyboardNavigation = false;
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Tab') keyboardNavigation = true;
    const panel = panelFor(event.target);
    if (panel && panel !== active && (event.key === 'Enter' || event.key === ' ')) {
      activate(panel);
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.key.toLowerCase() !== 'i') return;
    if (document.querySelector('dialog[open]') || (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])'))) return;
    if (!title.hidden) {
      for (const menu of title.querySelectorAll<HTMLDetailsElement>('details[open]')) menu.open = false;
      if (title.contains(document.activeElement)) root.querySelector<HTMLElement>('#scene')?.focus({ preventScroll: true });
    }
    title.hidden = !title.hidden;
    event.preventDefault();
  };
  title.hidden = true;
  prepare();
  const observer = new MutationObserver(records => {
    if (records.some(record => (record.type === 'attributes' && record.target === active) ||
      Array.from(record.addedNodes).some(node => node instanceof Element && (node.matches(observedSelector) || node.querySelector(observedSelector))))) prepare();
  });
  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('pointerup', onPointerEnd, true);
  document.addEventListener('pointercancel', onPointerEnd, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('wheel', onWheel, { capture: true, passive: false });
  document.addEventListener('focusin', onFocus, true);
  document.addEventListener('keydown', onKey, true);
  return { dispose() {
    observer.disconnect();
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('pointerup', onPointerEnd, true);
    document.removeEventListener('pointercancel', onPointerEnd, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('wheel', onWheel, true);
    document.removeEventListener('focusin', onFocus, true);
    document.removeEventListener('keydown', onKey, true);
    for (const panel of panels()) panel.classList.remove('floating-overlay', 'overlay-active');
    title.hidden = false;
  } };
}
