/** Fit one cockpit surface, so instruments, lettering and controls keep the same scale. */
export function createCockpitLayout(container: HTMLElement): { dispose(): void } {
  const deck = container.querySelector<HTMLElement>('.flight-deck');
  const instruments = container.querySelector<HTMLElement>('.instruments');
  if (!deck || !instruments) throw new Error('Cockpit layout requires the flight deck and instruments');
  container.classList.add('cockpit-fitted');
  let frame = 0;
  let disposed = false;

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
  fit();

  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      reviewObserver.disconnect();
      window.removeEventListener('resize', schedule);
      container.classList.remove('cockpit-fitted');
      container.style.removeProperty('--cockpit-scale');
      container.style.removeProperty('--deck-height');
      delete container.dataset.cockpitScale;
    },
  };
}
