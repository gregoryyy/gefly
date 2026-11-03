/** Fit one cockpit surface, so instruments, lettering and controls keep the same scale. */
export function createCockpitLayout(container: HTMLElement): { dispose(): void } {
  const deck = container.querySelector<HTMLElement>('.flight-deck');
  const instruments = container.querySelector<HTMLElement>('.instruments');
  if (!deck || !instruments) throw new Error('Cockpit layout requires the flight deck and instruments');
  container.classList.add('cockpit-fitted');
  let frame = 0;
  let disposed = false;
  let zoom = 1;
  let panX = 0;
  let panY = 0;

  function paintZoom(): void {
    if (!deck || !instruments) return;
    const fitted = Number(container.dataset.cockpitScale) || 1;
    instruments.style.transformOrigin = '0 0';
    instruments.style.transform = `translate(${panX / fitted}px, ${panY / fitted}px) scale(${zoom})`;
    deck.dataset.zoomed = String(zoom > 1);
    deck.dataset.panelZoom = String(zoom);
  }

  function wheel(event: WheelEvent): void {
    if (!deck || !instruments || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey
      || container.ownerDocument.querySelector('dialog[open]')
      || !Number.isFinite(event.deltaY) || !Number.isFinite(event.deltaX)
      || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    const unit = event.deltaMode === 0 ? 1 : event.deltaMode === 1 ? 16
      : event.deltaMode === 2 ? deck.clientHeight : 0;
    if (!unit) return;
    event.preventDefault();
    event.stopPropagation();
    const next = Math.max(1, Math.min(3, zoom * Math.exp(-Math.max(-200, Math.min(200, event.deltaY * unit)) * .002)));
    const rect = instruments.getBoundingClientRect();
    // Keep the instrument point under the pointer fixed in screen coordinates.
    panX += (event.clientX - rect.left) * (1 - next / zoom);
    panY += (event.clientY - rect.top) * (1 - next / zoom);
    zoom = next;
    if (zoom === 1) { panX = 0; panY = 0; }
    paintZoom();
  }

  function fit(): void {
    frame = 0;
    if (disposed || !deck || !instruments) return;
    const style = getComputedStyle(deck);
    const horizontalPadding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const verticalPadding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
      + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const headingHeight = deck.querySelector<HTMLElement>('.deck-heading')?.offsetHeight ?? 0;
    // offset sizes describe the canonical, unzoomed controls. No physics or camera state is changed.
    const naturalHeight = instruments.offsetHeight;
    const naturalWidth = instruments.offsetWidth;
    if (naturalHeight <= 0 || naturalWidth <= 0) return;
    let sceneReserve = 180;
    if (container.dataset.review === 'true') {
      const headerBottom = container.querySelector<HTMLElement>('.topbar')?.getBoundingClientRect().bottom ?? 0;
      const controlsHeight = container.querySelector<HTMLElement>('.control-panel')?.offsetHeight ?? 0;
      const transportHeight = container.querySelector<HTMLElement>('.flight-review')?.offsetHeight ?? 0;
      sceneReserve = Math.max(sceneReserve, headerBottom + 16
        + (container.clientWidth <= 760 ? 160 + controlsHeight : Math.max(controlsHeight, transportHeight) + 16));
    }
    const scale = Math.min(1,
      Math.max(1, deck.clientWidth - horizontalPadding) / naturalWidth,
      Math.max(1, container.clientHeight - sceneReserve - headingHeight - verticalPadding) / naturalHeight);
    const height = Math.ceil(naturalHeight * scale + headingHeight + verticalPadding);
    if (container.style.getPropertyValue('--cockpit-scale') !== String(scale)) {
      container.style.setProperty('--cockpit-scale', String(scale));
    }
    if (container.style.getPropertyValue('--deck-height') !== `${height}px`) {
      container.style.setProperty('--deck-height', `${height}px`);
    }
    container.dataset.cockpitScale = String(scale);
    // A viewport/layout change restores the full, fitted panel.
    zoom = 1; panX = 0; panY = 0;
    paintZoom();
  }
  function schedule(): void {
    if (!disposed && !frame) frame = requestAnimationFrame(fit);
  }
  const observer = new ResizeObserver(schedule);
  observer.observe(container);
  observer.observe(instruments);
  const controls = container.querySelector<HTMLElement>('.control-panel');
  if (controls) observer.observe(controls);
  const reviewObserver = new MutationObserver(schedule);
  reviewObserver.observe(container, { attributes: true, attributeFilter: ['data-review'] });
  window.addEventListener('resize', schedule);
  deck.addEventListener('wheel', wheel, { passive: false, capture: true });
  fit();

  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      reviewObserver.disconnect();
      window.removeEventListener('resize', schedule);
      deck.removeEventListener('wheel', wheel, { capture: true });
      instruments.style.removeProperty('transform');
      instruments.style.removeProperty('transform-origin');
      delete deck.dataset.zoomed;
      delete deck.dataset.panelZoom;
      container.classList.remove('cockpit-fitted');
      container.style.removeProperty('--cockpit-scale');
      container.style.removeProperty('--deck-height');
      delete container.dataset.cockpitScale;
    },
  };
}
