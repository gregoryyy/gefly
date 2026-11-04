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
  let zoom = 1;
  let panX = 0, panY = 0;
  let fitted = 1, naturalHeight = 0, naturalWidth = 0, headingHeight = 0, verticalPadding = 0;
  const maxZoom = 3;
  let fitKey = '';
  const controls = 'button,input,select,textarea,a,label,summary,[contenteditable],[role=button],[role=slider],[role=spinbutton],#nav1-gauge .navigation-gauge-face,#nav2-gauge .navigation-gauge-face';
  let drag: { id: number; x: number; y: number; panX: number; panY: number; active: boolean } | null = null;
  let suppressClick = false;

  function paintZoom(): void {
    if (!deck || !instruments) return;
    // Magnify only the clipped instrument surface. The deck and flying view
    // retain their fitted height, including while focusing a lower instrument.
    const width = naturalWidth * fitted;
    const baseLeft = (viewport.clientWidth - width) / 2;
    const scaledWidth = width * zoom;
    panX = scaledWidth <= viewport.clientWidth
      ? Math.max(-baseLeft, Math.min(viewport.clientWidth - baseLeft - scaledWidth, panX))
      : Math.max(viewport.clientWidth - baseLeft - scaledWidth, Math.min(-baseLeft, panX));
    instruments.style.transformOrigin = '0 0';
    instruments.style.transform = `translate(${panX / fitted}px, ${panY / fitted}px) scale(${zoom})`;
    // Clamp the rendered edges, including CSS zoom rounding, rather than an
    // estimated height. The enlarged surface must keep covering the frame.
    const surface = instruments.getBoundingClientRect(), bounds = viewport.getBoundingClientRect();
    const correctionY = surface.height >= bounds.height
      ? Math.max(bounds.bottom - surface.bottom, Math.min(bounds.top - surface.top, 0))
      : bounds.top - surface.top;
    if (correctionY !== 0) {
      panY += correctionY;
      instruments.style.transform = `translate(${panX / fitted}px, ${panY / fitted}px) scale(${zoom})`;
    }
    deck.dataset.zoomed = String(zoom > 1);
    deck.dataset.panelZoom = String(zoom);
  }
  function resetZoom(): void { stopDrag(); zoom = 1; panX = panY = 0; paintZoom(); }
  function doubleClick(event: MouseEvent): void {
    if (suppressClick || event.button !== 0 || !(event.target instanceof Element)
      || event.target.closest(controls)) return;
    event.preventDefault(); event.stopPropagation(); resetZoom();
  }

  function pointerDown(event: PointerEvent): void {
    if (event.button !== 0 || !event.isPrimary) return;
    stopDrag();
    suppressClick = false;
    if (zoom === 1 || event.defaultPrevented
      || !(event.target instanceof Element) || event.target.closest(controls)
      || container.ownerDocument.querySelector('dialog[open]')) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, panX, panY, active: false };
    event.preventDefault();
  }

  function pointerMove(event: PointerEvent): void {
    if (!drag || event.pointerId !== drag.id || !deck) return;
    if ((event.buttons & 1) === 0) { stopDrag(); return; }
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.active) {
      if (Math.hypot(dx, dy) < 5) return;
      drag.active = true;
      deck.setPointerCapture(event.pointerId);
      deck.dataset.panelDragging = 'true';
    }
    event.preventDefault();
    panX = drag.panX + dx; panY = drag.panY + dy;
    paintZoom();
  }

  function stopDrag(event?: PointerEvent): void {
    if (!drag || event && event.pointerId !== drag.id) return;
    const previous = drag; drag = null;
    suppressClick = previous.active && event?.type === 'pointerup';
    if (deck?.hasPointerCapture(previous.id)) deck.releasePointerCapture(previous.id);
    if (deck) delete deck.dataset.panelDragging;
  }

  function click(event: MouseEvent): void {
    if (!suppressClick) return;
    suppressClick = false;
    if (event.detail > 0) { event.preventDefault(); event.stopPropagation(); }
  }

  function wheel(event: WheelEvent): void {
    if (!deck || !instruments || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey
      || container.ownerDocument.querySelector('dialog[open]')
      || !Number.isFinite(event.deltaY) || !Number.isFinite(event.deltaX)) return;
    const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
    if (horizontal ? zoom === 1 : event.deltaY === 0) return;
    const unit = event.deltaMode === 0 ? 1 : event.deltaMode === 1 ? 16
      : event.deltaMode === 2 ? deck.clientHeight : 0;
    if (!unit) return;
    event.preventDefault();
    event.stopPropagation();
    if (horizontal) { panX -= event.deltaX * unit; paintZoom(); return; }
    const next = Math.max(1, Math.min(maxZoom, zoom * Math.exp(-Math.max(-200, Math.min(200, event.deltaY * unit)) * .002)));
    const rect = instruments.getBoundingClientRect();
    // Keep the instrument point under the pointer fixed in screen coordinates.
    panX += (event.clientX - rect.left) * (1 - next / zoom);
    panY += (event.clientY - rect.top) * (1 - next / zoom);
    zoom = next;
    if (zoom === 1) panX = panY = 0;
    paintZoom();
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
    verticalPadding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
      + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    headingHeight = deck.querySelector<HTMLElement>('.deck-heading')?.offsetHeight ?? 0;
    // offset sizes describe the canonical, unzoomed controls. No physics or camera state is changed.
    naturalHeight = instruments.offsetHeight;
    naturalWidth = instruments.offsetWidth;
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
    fitted = scale;
    container.style.setProperty('--deck-height', `${Math.ceil(naturalHeight * fitted + headingHeight + verticalPadding)}px`);
    if (container.style.getPropertyValue('--cockpit-scale') !== String(scale)) {
      container.style.setProperty('--cockpit-scale', String(scale));
    }
    container.dataset.cockpitScale = String(scale);
    // Control text can resize an observed overlay without changing this fit.
    // Keep its current focus; only actual viewport/layout changes restore fit.
    const key = [scale, naturalWidth, naturalHeight, headingHeight, verticalPadding, container.clientWidth, container.clientHeight, container.dataset.review === 'true'].join('/');
    if (key !== fitKey) { fitKey = key; resetZoom(); } else paintZoom();
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
  // Include the housing and bottom padding: they are part of the panel too.
  deck.addEventListener('wheel', wheel, { passive: false, capture: true });
  deck.addEventListener('dblclick', doubleClick);
  deck.addEventListener('pointerdown', pointerDown);
  deck.addEventListener('click', click, true);
  window.addEventListener('pointermove', pointerMove, { passive: false });
  window.addEventListener('pointerup', stopDrag);
  window.addEventListener('pointercancel', stopDrag);
  deck.addEventListener('lostpointercapture', stopDrag);
  window.addEventListener('blur', cancelDrag);
  fit();

  function cancelDrag(): void { stopDrag(); }

  return {
    dispose() {
      disposed = true;
      stopDrag();
      cancelAnimationFrame(frame);
      observer.disconnect();
      reviewObserver.disconnect();
      window.removeEventListener('resize', schedule);
      deck.removeEventListener('wheel', wheel, { capture: true });
      deck.removeEventListener('dblclick', doubleClick);
      deck.removeEventListener('pointerdown', pointerDown);
      deck.removeEventListener('click', click, true);
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerup', stopDrag);
      window.removeEventListener('pointercancel', stopDrag);
      deck.removeEventListener('lostpointercapture', stopDrag);
      window.removeEventListener('blur', cancelDrag);
      viewport.before(instruments); viewport.remove();
      instruments.style.removeProperty('transform');
      instruments.style.removeProperty('transform-origin');
      delete deck.dataset.zoomed;
      delete deck.dataset.panelZoom;
      container.classList.remove('cockpit-fitted');
      container.style.removeProperty('--cockpit-scale');
      container.style.removeProperty('--deck-height');
      container.style.removeProperty('--review-readouts-offset');
      delete container.dataset.cockpitScale;
    },
  };
}
