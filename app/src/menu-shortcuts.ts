/** Options uses its existing button handler and disabled state. */
export function installMenuShortcuts(root: HTMLElement): () => void {
  const button = root.querySelector<HTMLButtonElement>('#controls-settings');
  if (button) {
    button.setAttribute('aria-keyshortcuts', 'O');
    const label = document.createElement('kbd');
    label.textContent = 'O'; label.className = 'menu-shortcut';
    button.append(' ', label);
  }
  root.querySelector('#pause')?.setAttribute('aria-keyshortcuts', 'Space');
  const onKey = (event: KeyboardEvent) => {
    if (event.code !== 'KeyO' || event.altKey || event.shiftKey || event.ctrlKey || event.metaKey || event.repeat) return;
    if (document.querySelector('dialog[open]') || (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])'))) return;
    if (!button || button.disabled) return;
    event.preventDefault(); button.click();
  };
  document.addEventListener('keydown', onKey, true);
  return () => document.removeEventListener('keydown', onKey, true);
}
