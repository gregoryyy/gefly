import { fitPanel, panPanel, zoomPanel, type PanelFrame, type PanelZoom } from './panel-zoom.ts';

const interactivePanel = [
  'button,input,textarea,select,a,label,summary',
  ...['button', 'slider', 'spinbutton', 'checkbox', 'radio', 'switch', 'textbox', 'searchbox', 'combobox', 'listbox',
    'option', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'tab', 'treeitem', 'link'].map(role => `[role="${role}"]`),
  '[contenteditable]:not([contenteditable="false"])',
  '#nav1-gauge .navigation-gauge-face,#nav2-gauge .navigation-gauge-face',
].join(',');

/** Fit one cockpit surface, so instruments, lettering and controls keep the same scale. */
export function createCockpitLayout(container: HTMLElement): { dispose(): void } {
  const deck = container.querySelector<HTMLElement>('.flight-deck');
  const instruments = container.querySelector<HTMLElement>('.instruments');
  if (!deck || !instruments) throw new Error('Cockpit layout requires the flight deck and instruments');
  const viewport = document.createElement('div');
  viewport.className = 'cockpit-viewport';
  instruments.before(viewport); viewport.append(instruments);
  let observedTransport: HTMLElement | null = null;
  container.classList.add('cockpit-fitted');
  let frame = 0;
  let disposed = false;
  let panelFrame: PanelFrame | null = null;
  let panelZoom: PanelZoom = { zoom: 1, x: 0, y: 0 };
  let fitScale = 1;
  let layoutKey = '';
  let drag: { pointerId: number; x: number; y: number; initial: PanelZoom; active: boolean } | null = null;
  let suppressedClickPointer: number | null = null;
  function endDrag(): void {
    const previous = drag; drag = null; delete deck!.dataset.panelDragging;
    if (!previous) return;
    if (previous.active) suppressedClickPointer = previous.pointerId;
    if (deck!.hasPointerCapture(previous.pointerId)) deck!.releasePointerCapture(previous.pointerId);
  }
  function paint(): void {
    // One transform maps canonical instruments into the frame. Translation is
    // already in screen CSS pixels, exactly as supplied by the panel helpers.
    instruments!.style.transformOrigin = '0 0';
    instruments!.style.transform = `translate(${panelZoom.x}px, ${panelZoom.y}px) scale(${fitScale * panelZoom.zoom})`;
    container.dataset.panelZoom = String(panelZoom.zoom);
  }
  function reset(): void {
    endDrag();
    if (!panelFrame) return;
    panelZoom = fitPanel(panelFrame); paint();
  }
  function fit(): void {
    frame = 0;
    if (disposed || !deck || !instruments) return;
    const transport = container.querySelector<HTMLElement>('.flight-review');
    if (transport && transport !== observedTransport) {
      if (observedTransport) observer.unobserve(observedTransport);
      observedTransport = transport; observer.observe(transport);
    }
    const style = getComputedStyle(deck);
    const horizontalPadding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const verticalPadding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
      + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const headingHeight = deck.querySelector<HTMLElement>('.deck-heading')?.getBoundingClientRect().height ?? 0;
    // Measure canonical layout, including fractional auto-height rows. Restore
    // the current view synchronously so an unrelated observer callback neither
    // flashes the natural size nor discards the learner's zoom/pan position.
    const previousTransform = instruments.style.transform;
    instruments.style.transform = 'none';
    const naturalRect = instruments.getBoundingClientRect();
    instruments.style.transform = previousTransform;
    const naturalHeight = naturalRect.height;
    const naturalWidth = naturalRect.width;
    if (naturalHeight <= 0 || naturalWidth <= 0) return;
    // Give the flying view about 60% of the window. A 300px practical floor
    // applies while a compact cockpit still fits; very short windows keep a
    // proportional split instead of reserving more space than they contain.
    const viewportHeight = container.clientHeight;
    const cockpitFloor = Math.min(180, viewportHeight * .4);
    let sceneReserve = Math.min(Math.max(300, viewportHeight * .6), viewportHeight - cockpitFloor);
    if (container.dataset.review === 'true') {
      const headerBottom = container.querySelector<HTMLElement>('.topbar')?.getBoundingClientRect().bottom ?? 0;
      const controlsHeight = container.querySelector<HTMLElement>('.control-panel')?.offsetHeight ?? 0;
      const transportHeight = transport?.offsetHeight ?? 0;
      // The transport can wrap as save/load controls and text resize. Stack
      // readouts above its measured height instead of an assumed 160px slot.
      const stackedOffset = transportHeight + (container.clientWidth <= 620 ? 12 : 16) + 16;
      container.style.setProperty('--review-readouts-offset', `${stackedOffset}px`);
      sceneReserve = Math.max(sceneReserve, headerBottom + 16
        + (container.clientWidth <= 760 ? stackedOffset + controlsHeight : Math.max(controlsHeight, transportHeight) + 16));
    } else container.style.removeProperty('--review-readouts-offset');
    const scale = Math.min(1,
      Math.max(1, deck.clientWidth - horizontalPadding) / naturalWidth,
      Math.max(1, container.clientHeight - sceneReserve - headingHeight - verticalPadding) / naturalHeight);
    container.dataset.cockpitScale = String(scale);
    const nextKey = [container.clientWidth, container.clientHeight, naturalWidth, naturalHeight,
      headingHeight, scale, deck.clientWidth - horizontalPadding, container.dataset.review].join(':');
    if (nextKey !== layoutKey) {
      // The fitted rectangle and helper offsets share one physical origin;
      // CSS zoom must not introduce an engine-dependent second coordinate scale.
      const baseWidth = naturalWidth * scale, baseHeight = naturalHeight * scale;
      viewport.style.height = `${baseHeight}px`;
      container.style.setProperty('--deck-height', `${baseHeight + headingHeight + verticalPadding}px`);
      const viewportRect = viewport.getBoundingClientRect();
      fitScale = scale;
      panelFrame = { width: viewportRect.width, height: viewportRect.height,
        baseWidth, baseHeight };
      layoutKey = nextKey; reset();
    }
  }
  function schedule(): void {
    if (!disposed && !frame) frame = requestAnimationFrame(fit);
  }
  const observer = new ResizeObserver(schedule);
  observer.observe(container);
  observer.observe(instruments);
  const controlPanel = container.querySelector<HTMLElement>('.control-panel');
  if (controlPanel) observer.observe(controlPanel);
  const reviewObserver = new MutationObserver(schedule);
  reviewObserver.observe(container, { attributes: true, attributeFilter: ['data-review'] });
  window.addEventListener('resize', schedule);
  fit();
  function wheel(event: WheelEvent): void {
    if (!panelFrame || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey
      || container.ownerDocument.querySelector('dialog[open]')
      || ![event.deltaX, event.deltaY, event.clientX, event.clientY].every(Number.isFinite)) return;
    const unit = event.deltaMode === 0 ? 1 : event.deltaMode === 1 ? 16
      : event.deltaMode === 2 ? panelFrame.height : NaN;
    const horizontal = Math.abs(event.deltaX) >= Math.abs(event.deltaY);
    if (horizontal && panelZoom.zoom === 1) return;
    const deltaPixels = (horizontal ? event.deltaX : event.deltaY) * unit;
    if (!Number.isFinite(deltaPixels) || deltaPixels === 0) return;
    const rect = viewport.getBoundingClientRect();
    event.preventDefault(); event.stopPropagation();
    endDrag();
    panelZoom = horizontal ? panPanel(panelZoom, panelFrame, { x: -deltaPixels, y: 0 })
      : zoomPanel(panelZoom, panelFrame, { x: event.clientX - rect.left, y: event.clientY - rect.top }, deltaPixels);
    paint();
  }
  function doubleClick(event: MouseEvent): void {
    const target = event.target instanceof Element ? event.target : null;
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey
      || container.ownerDocument.querySelector('dialog[open]')
      || target?.closest(interactivePanel)) return;
    event.preventDefault(); event.stopPropagation(); reset();
  }
  function pointerDown(event: PointerEvent): void {
    const target = event.target instanceof Element ? event.target : null;
    if (!panelFrame || panelZoom.zoom === 1 || event.defaultPrevented || !event.isPrimary || event.button !== 0
      || event.ctrlKey || event.metaKey || event.altKey || target?.closest(interactivePanel)
      || container.ownerDocument.querySelector('dialog[open]')
      || ![event.clientX, event.clientY].every(Number.isFinite)) return;
    endDrag();
    drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, initial: { ...panelZoom }, active: false };
    // Eligible housing has no native editing gesture; keep text selection from
    // competing with the drag while controls retain their original handlers.
    event.preventDefault();
  }
  function pointerMove(event: PointerEvent): void {
    if (!drag || !panelFrame || event.pointerId !== drag.pointerId) return;
    if ((event.buttons & 1) === 0 || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY) || event.ctrlKey || event.metaKey || event.altKey
      || container.ownerDocument.querySelector('dialog[open]')) { endDrag(); return; }
    const x = event.clientX - drag.x, y = event.clientY - drag.y;
    if (!drag.active && Math.hypot(x, y) < 5) return;
    if (!drag.active) {
      drag.active = true; deck!.dataset.panelDragging = 'true'; deck!.setPointerCapture(event.pointerId);
    }
    event.preventDefault(); event.stopPropagation();
    panelZoom = panPanel(drag.initial, panelFrame, { x, y }); paint();
  }
  function pointerEnd(event: PointerEvent): void {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (drag.active) { event.preventDefault(); event.stopPropagation(); }
    endDrag();
  }
  function newPointer(): void { suppressedClickPointer = null; }
  function suppressDragClick(event: MouseEvent): void {
    if (suppressedClickPointer === null || event.detail === 0
      || event instanceof PointerEvent && event.pointerId !== suppressedClickPointer) return;
    suppressedClickPointer = null; event.preventDefault(); event.stopImmediatePropagation();
  }
  // Capture gestures over controls as well as housing, before a native numeric
  // input could interpret the wheel as a value edit. Focus never pans the panel.
  deck.addEventListener('wheel', wheel, { passive: false, capture: true });
  deck.addEventListener('dblclick', doubleClick, true);
  deck.addEventListener('pointerdown', pointerDown, true);
  deck.addEventListener('lostpointercapture', pointerEnd, true);
  window.addEventListener('pointerdown', newPointer, true);
  window.addEventListener('pointermove', pointerMove, { passive: false, capture: true });
  window.addEventListener('pointerup', pointerEnd, true);
  window.addEventListener('pointercancel', pointerEnd, true);
  window.addEventListener('blur', endDrag);
  window.addEventListener('click', suppressDragClick, true);

  return {
    dispose() {
      disposed = true;
      endDrag();
      cancelAnimationFrame(frame);
      observer.disconnect();
      reviewObserver.disconnect();
      window.removeEventListener('resize', schedule);
      deck.removeEventListener('wheel', wheel, true);
      deck.removeEventListener('dblclick', doubleClick, true);
      deck.removeEventListener('pointerdown', pointerDown, true);
      deck.removeEventListener('lostpointercapture', pointerEnd, true);
      window.removeEventListener('pointerdown', newPointer, true);
      window.removeEventListener('pointermove', pointerMove, true);
      window.removeEventListener('pointerup', pointerEnd, true);
      window.removeEventListener('pointercancel', pointerEnd, true);
      window.removeEventListener('blur', endDrag);
      window.removeEventListener('click', suppressDragClick, true);
      viewport.before(instruments); viewport.remove();
      instruments.style.removeProperty('transform');
      instruments.style.removeProperty('transform-origin');
      container.classList.remove('cockpit-fitted');
      container.style.removeProperty('--deck-height');
      container.style.removeProperty('--review-readouts-offset');
      delete container.dataset.cockpitScale;
      delete container.dataset.panelZoom;
    },
  };
}
