import { demoGetExpenses, demoGetProducts, demoGetSales, demoId, demoSetExpenses, demoSetProducts, demoSetSales } from './demoStore';
import { allocateProportionalTotals } from '../utils/finance';

export const demoApi = {
  listProducts() {
    const list = demoGetProducts();
    return list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  },

  createProduct(payload) {
    const now = new Date().toISOString();
    const next = {
      id: demoId('p'),
      name: String(payload.name || '').trim(),
      barcode: String(payload.barcode || '').trim(),
      category: String(payload.category || '').trim(),
      quantity: Number(payload.quantity || 0),
      cost_price: Number(payload.cost_price || 0),
      sale_price: Number(payload.sale_price || 0),
      margin: Number(payload.margin || 0) || undefined,
      created_at: now,
      updated_at: now
    };
    const list = demoGetProducts();
    demoSetProducts([next, ...list]);
    return next;
  },

  updateProduct(id, patch) {
    const list = demoGetProducts();
    const idx = list.findIndex(p => String(p.id) === String(id));
    if (idx === -1) return null;
    const now = new Date().toISOString();
    const updated = { ...list[idx], ...patch, updated_at: now };
    const next = [...list];
    next[idx] = updated;
    demoSetProducts(next);
    return updated;
  },

  deleteProduct(id) {
    const list = demoGetProducts();
    demoSetProducts(list.filter(p => String(p.id) !== String(id)));
  },

  recordSale({ items, discountValue = 0 }) {
    const products = demoGetProducts();
    const byBarcode = new Map(products.map(p => [String(p.barcode || ''), p]));
    const now = new Date().toISOString();
    const rows = [];
    const sales = demoGetSales();
    const itemSubtotals = items.map((it) => Number(it.unit_price || 0) * Number(it.quantity || 1));
    const subtotal = itemSubtotals.reduce((a, b) => a + Number(b || 0), 0);
    const total = Math.max(0, subtotal - Number(discountValue || 0));
    const allocated = allocateProportionalTotals(itemSubtotals, total);

    items.forEach((it, idx) => {
      const qty = Number(it.quantity || 1);
      const unit = Number(it.unit_price || 0);
      const revenue = Number(allocated[idx] || 0);
      const p = byBarcode.get(String(it.barcode || '')) || products.find(pr => String(pr.id) === String(it.id));
      const costUnit = Number(p?.cost_price || 0);
      const costTotal = Number((costUnit * qty).toFixed(2));
      rows.push({
        id: demoId('s'),
        user_id: 'demo',
        product_id: p?.id || null,
        product_name: it.name,
        barcode: it.barcode || p?.barcode || null,
        quantity: qty,
        unit_price: unit,
        total_price: revenue,
        cost_total: costTotal,
        profit: Number((revenue - costTotal).toFixed(2)),
        sale_date: now,
        created_at: now
      });
      if (p?.id) {
        const newQty = Math.max(0, Number(p.quantity || 0) - qty);
        const idx = products.findIndex(pr => String(pr.id) === String(p.id));
        if (idx >= 0) products[idx] = { ...products[idx], quantity: newQty, updated_at: now };
      }
    });
    demoSetProducts(products);
    demoSetSales([...rows, ...sales]);
    return rows;
  },

  listSales() {
    const list = demoGetSales();
    return list.sort((a, b) => new Date(b.sale_date || b.created_at || 0) - new Date(a.sale_date || a.created_at || 0));
  },

  listExpenses({ from, to } = {}) {
    const list = demoGetExpenses();
    const f = from ? String(from).slice(0, 10) : null;
    const t = to ? String(to).slice(0, 10) : null;
    return list
      .filter(e => {
        const d = String(e.date || '').slice(0, 10);
        if (f && d < f) return false;
        if (t && d > t) return false;
        return true;
      })
      .sort((a, b) => (String(b.date || '').localeCompare(String(a.date || ''))) || (new Date(b.created_at || 0) - new Date(a.created_at || 0)));
  },

  createExpense(payload) {
    const now = new Date().toISOString();
    const next = {
      id: demoId('e'),
      user_id: 'demo',
      description: String(payload.description || '').trim(),
      amount: Number(payload.amount || 0),
      category: String(payload.category || 'Geral').trim() || 'Geral',
      date: String(payload.date || now).slice(0, 10),
      recurring: Boolean(payload.recurring),
      created_at: now
    };
    const list = demoGetExpenses();
    demoSetExpenses([next, ...list]);
    return next;
  },

  deleteExpense(id) {
    const list = demoGetExpenses();
    demoSetExpenses(list.filter(e => String(e.id) !== String(id)));
  }
};
