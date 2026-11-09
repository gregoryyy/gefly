export function createAirportPlayControls(onStart?: (runway: string) => void, onStop?: () => void) {
  const element = document.createElement('section'); element.className = 'airport-play';
  element.setAttribute('aria-label', 'Runway exercise');
  element.innerHTML = '<div class="airport-play-heading"><strong>RUNWAY PLAY</strong><span id="airport-play-status">EDFE · approximate practice geometry</span></div><div class="airport-play-actions"><select id="airport-play-runway" aria-label="Exercise runway"><option value="26">EDFE 26 · asphalt</option><option value="08">EDFE 08 · asphalt</option></select><button id="airport-play-start" type="button">Start at runway</button><button id="airport-play-stop" type="button">Stop exercise</button></div><small>At rest · engine idle · parking brake set. N releases brake; 1–9 / 0 sets 10–100% throttle; § selects idle. Not an operational chart.</small>';
  const runway = element.querySelector<HTMLSelectElement>('select')!, start = element.querySelector<HTMLButtonElement>('#airport-play-start')!, stop = element.querySelector<HTMLButtonElement>('#airport-play-stop')!;
  let airport = 'EDFE', readOnly = false;
  start.onclick = () => { if (!readOnly && airport === 'EDFE') onStart?.(runway.value); };
  stop.onclick = () => { if (!readOnly) onStop?.(); };
  return { element,
    selectedRunway(): '08' | '26' { return runway.value === '08' ? '08' : '26'; },
    setAirport(id: string) { airport = id; },
    update(active: boolean, reviewing: boolean) {
      readOnly = reviewing; start.disabled = reviewing || airport !== 'EDFE' || !onStart;
      stop.disabled = reviewing || !active || !onStop; runway.disabled = reviewing || airport !== 'EDFE';
      element.querySelector('#airport-play-status')!.textContent = airport !== 'EDFE' ? `${airport}: runway start not prepared` : active ? 'EDFE exercise active' : 'EDFE · approximate practice geometry';
    },
  };
}
