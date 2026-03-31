const KEY = 'estoquePro:demo';

export function isDemoEnabled() {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function enableDemo() {
  try { localStorage.setItem(KEY, '1'); } catch {}
}

export function disableDemo() {
  try { localStorage.removeItem(KEY); } catch {}
}

