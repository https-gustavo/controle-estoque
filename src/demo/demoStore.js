import { demoSeed } from './demoData';

const PREFIX = 'estoquePro:demo:';

function safeParse(json, fallback) {
  try { return JSON.parse(json); } catch { return fallback; }
}

function key(name) { return `${PREFIX}${name}`; }

function ensureSeeded() {
  try {
    if (!localStorage.getItem(key('seeded'))) {
      localStorage.setItem(key('products'), JSON.stringify(demoSeed.products));
      localStorage.setItem(key('sales'), JSON.stringify(demoSeed.sales));
      localStorage.setItem(key('expenses'), JSON.stringify(demoSeed.expenses));
      localStorage.setItem(key('seeded'), '1');
    }
  } catch {}
}

export function demoReset() {
  try {
    localStorage.removeItem(key('products'));
    localStorage.removeItem(key('sales'));
    localStorage.removeItem(key('expenses'));
    localStorage.removeItem(key('seeded'));
  } catch {}
  ensureSeeded();
}

export function demoGetProducts() {
  ensureSeeded();
  try { return safeParse(localStorage.getItem(key('products')) || '[]', []); } catch { return []; }
}
export function demoSetProducts(list) {
  try { localStorage.setItem(key('products'), JSON.stringify(Array.isArray(list) ? list : [])); } catch {}
}

export function demoGetSales() {
  ensureSeeded();
  try { return safeParse(localStorage.getItem(key('sales')) || '[]', []); } catch { return []; }
}
export function demoSetSales(list) {
  try { localStorage.setItem(key('sales'), JSON.stringify(Array.isArray(list) ? list : [])); } catch {}
}

export function demoGetExpenses() {
  ensureSeeded();
  try { return safeParse(localStorage.getItem(key('expenses')) || '[]', []); } catch { return []; }
}
export function demoSetExpenses(list) {
  try { localStorage.setItem(key('expenses'), JSON.stringify(Array.isArray(list) ? list : [])); } catch {}
}

export function demoId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

