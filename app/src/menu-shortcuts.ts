const commands = [
  ['#systems-open', 'Y'], ['#cockpit', 'C'], ['#chase', 'V'], ['#toggle-map', 'M'],
  ['#toggle-flight-data', 'D'], ['#toggle-stall-awareness', 'A'], ['#toggle-controls', 'F'],
  ['#save-recording', 'S'], ['#load-recording', 'L'], ['#handbook-open', 'H'], ['#loading-open', 'W'], ['#controls-settings', 'O'], ['#reset', 'R'],
  ['#engine-open', 'G'], ['#radio-nav-open', 'B'], ['#navigation-open', 'N'], ['#autopilot-open', 'P'],
  ['[data-landing="normal"]', '1'], ['[data-landing="hard"]', '2'],
  ['[data-landing="side"]', '3'], ['[data-landing="banked"]', '4'],
  ['#airborne-practice', 'E'], ['#taunus-practice', 'T'], ['#eddf-ils-practice', 'I'],
  ['[data-region="darmstadt"]', '6'], ['[data-region="odenwald"]', '7'], ['[data-region="spessart"]', '8'],
] as const;

/** Install menu shortcuts without bypassing the existing button handlers or disabled state. */
export function installMenuShortcuts(root: HTMLElement): () => void {
  const mark = () => {
    for (const [selector, key] of commands) {
      const button = root.querySelector<HTMLButtonElement>(selector);
      if (!button || button.dataset.menuShortcut === key) continue;
      button.dataset.menuShortcut = key;
      button.setAttribute('aria-keyshortcuts', key === 'O' ? 'O' : `${key === 'V' ? 'V ' : key === 'M' ? 'M ' : ''}Alt+Shift+${key}`);
      const label = document.createElement('kbd');
      label.textContent = key === 'O' ? 'O' : /Mac|iPhone|iPad/.test(navigator.platform) ? `⌥⇧${key}` : `Alt+Shift+${key}`;
      label.className = 'menu-shortcut';
      button.append(' ', label);
    }
    root.querySelector('#pause')?.setAttribute('aria-keyshortcuts', 'Space');
  };
  const onKey = (event: KeyboardEvent) => {
    const plainOptions = event.code === 'KeyO' && !event.altKey && !event.shiftKey;
    if (event.ctrlKey || event.metaKey || event.repeat || (!plainOptions && (!event.altKey || !event.shiftKey))) return;
    if (document.querySelector('dialog[open]') || (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])'))) return;
    // KeyboardEvent.code remains stable when Shift changes the printable character.
    const key = event.code.startsWith('Key') ? event.code.slice(3) : event.code.startsWith('Digit') ? event.code.slice(5) : '';
    const command = commands.find(([, shortcut]) => shortcut === key);
    if (!command) return;
    const button = root.querySelector<HTMLButtonElement>(command[0]);
    if (!button || button.disabled) return;
    event.preventDefault();
    button.click();
  };
  mark();
  const selectors = commands.map(([selector]) => selector).join(',');
  const observer = new MutationObserver(records => {
    if (records.some(record => Array.from(record.addedNodes).some(node => node instanceof Element && (node.matches(selectors) || node.querySelector(selectors))))) mark();
  });
  observer.observe(root, { childList: true, subtree: true });
  document.addEventListener('keydown', onKey, true);
  return () => { observer.disconnect(); document.removeEventListener('keydown', onKey, true); };
}
