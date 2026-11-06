interface CwsOptions {
  target: EventTarget;
  cancelTarget: EventTarget;
  canStart: (event: KeyboardEvent) => boolean;
  beforeChange: () => void;
  onChange: (held: boolean) => void;
}

/** Keyboard and panel holds share one momentary switch; neither latches AP state. */
export function createCwsControls(options: CwsOptions) {
  const sources = new Set<'keyboard' | 'panel'>();
  let disposed = false;
  function change(source: 'keyboard' | 'panel', held: boolean): void {
    if (disposed) return;
    const previous = sources.size > 0;
    if (held) sources.add(source); else sources.delete(source);
    const active = sources.size > 0;
    if (previous !== active) { options.beforeChange(); options.onChange(active); }
  }
  function releaseAll(): boolean {
    if (disposed || !sources.size) return false;
    sources.clear(); options.beforeChange(); options.onChange(false); return true;
  }
  const down = (event: Event) => {
    if (disposed) return;
    const key = event as KeyboardEvent;
    if (key.code !== 'KeyC') return;
    if (sources.has('keyboard')) { key.preventDefault(); key.stopPropagation(); return; }
    if (key.repeat || key.ctrlKey || key.metaKey || key.altKey || key.isComposing || !options.canStart(key)) return;
    key.preventDefault(); key.stopPropagation(); change('keyboard', true);
  };
  const up = (event: Event) => {
    if (disposed) return;
    const key = event as KeyboardEvent;
    // Release also after focus/context/modifiers change; a guard must never trap CWS.
    if (key.code !== 'KeyC' || !sources.has('keyboard')) return;
    key.preventDefault(); key.stopPropagation(); change('keyboard', false);
  };
  const cancel = () => { releaseAll(); };
  options.target.addEventListener('keydown', down, true);
  options.target.addEventListener('keyup', up, true);
  options.cancelTarget.addEventListener('blur', cancel);
  return {
    setPanel(held: boolean) { change('panel', held); },
    releaseAll,
    dispose() {
      if (disposed) return;
      releaseAll(); disposed = true;
      options.target.removeEventListener('keydown', down, true);
      options.target.removeEventListener('keyup', up, true);
      options.cancelTarget.removeEventListener('blur', cancel);
    },
  };
}
