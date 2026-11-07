import { COUNTRY_IMAGERY } from './country-imagery.ts';

/** Mirror the PNOA credit beside the view whenever the renderer includes it. */
export function showVisibleSpainCredit(container: HTMLElement, rendererCredits: Element, bottom_px: number): () => void {
  const source = COUNTRY_IMAGERY.find(item => item.id === 'es')!;
  const credit = document.createElement('div');
  credit.className = 'visible-spain-photo-credit';
  credit.style.cssText = `position:absolute;left:4px;bottom:${bottom_px}px;z-index:4;max-width:min(460px,calc(100% - 12px));padding:2px 4px;background:#102532e8;color:#fff;font:11px/1.3 system-ui;pointer-events:auto;`;
  credit.innerHTML = source.attribution;
  for (const link of credit.querySelectorAll('a')) link.style.color = 'inherit';
  credit.hidden = true;
  container.append(credit);
  const update = () => { credit.hidden = !rendererCredits.textContent?.includes('PNOA 2024'); };
  const observer = new MutationObserver(update);
  observer.observe(rendererCredits, { childList: true, subtree: true, characterData: true });
  update();
  return () => { observer.disconnect(); credit.remove(); };
}
