import React, { useEffect, useMemo, useRef, useState } from 'react';
import ProductAutocomplete from './ProductAutocomplete';
import { demoApi } from '../../demo/demoApi';

function toNum(v) {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isNaN(n) ? 0 : n;
}

export default function StockEntryForm({ supabase, userId, demo, products, onAfterChange, showToast }) {
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [entries, setEntries] = useState([]);

  const [form, setForm] = useState({
    product_id: '',
    name: '',
    barcode: '',
    category: '',
    quantity: '',
    cost_price: '',
    sale_price: ''
  });

  const qtyRef = useRef(null);

  const existing = useMemo(() => {
    if (form.product_id) return (products || []).find(p => String(p.id) === String(form.product_id)) || null;
    const b = String(form.barcode || '').trim();
    if (b) return (products || []).find(p => String(p.barcode || '') === b) || null;
    const n = String(form.name || '').trim().toLowerCase();
    if (n) return (products || []).find(p => String(p.name || '').trim().toLowerCase() === n) || null;
    return null;
  }, [form.product_id, form.barcode, form.name, products]);

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const normalizeEntry = (src) => ({
    product_id: src.product_id ? String(src.product_id) : '',
    name: String(src.name || '').trim(),
    barcode: String(src.barcode || '').trim(),
    category: String(src.category || '').trim(),
    quantity: parseInt(String(src.quantity || '0'), 10) || 0,
    cost_price: toNum(src.cost_price),
    sale_price: src.sale_price === '' ? '' : String(src.sale_price ?? '')
  });

  const canAddEntry = (src) => {
    const e = normalizeEntry(src);
    if (!e.name) return false;
    if (!e.barcode) return false;
    if (!(e.quantity > 0)) return false;
    if (!(e.cost_price > 0)) return false;
    return true;
  };

  const clearForm = () => setForm({ product_id:'', name:'', barcode:'', category:'', quantity:'', cost_price:'', sale_price:'' });

  const addToList = () => {
    if (!canAddEntry(form)) { showToast?.('Preencha nome, código, custo e quantidade', 'danger'); return; }
    const next = normalizeEntry(form);
    setEntries(prev => {
      const idx = prev.findIndex(p => (next.product_id && p.product_id === next.product_id) || (!next.product_id && next.barcode && p.barcode === next.barcode));
      if (idx === -1) return [...prev, next];
      const cur = prev[idx];
      const curQty = Number(cur.quantity || 0);
      const nextQty = Number(next.quantity || 0);
      const denom = curQty + nextQty;
      const cost = denom > 0 ? ((Number(cur.cost_price || 0) * curQty) + (Number(next.cost_price || 0) * nextQty)) / denom : Number(next.cost_price || 0);
      const merged = {
        ...cur,
        name: next.name || cur.name,
        barcode: next.barcode || cur.barcode,
        category: next.category || cur.category,
        quantity: denom,
        cost_price: Number.isFinite(cost) ? cost : Number(next.cost_price || 0),
        sale_price: next.sale_price !== '' ? next.sale_price : cur.sale_price
      };
      const out = [...prev];
      out[idx] = merged;
      return out;
    });
    clearForm();
    setSearch('');
    setTimeout(() => qtyRef.current?.focus(), 0);
    showToast?.('Adicionado à lista', 'success');
  };

  const removeEntry = (idx) => setEntries(prev => prev.filter((_, i) => i !== idx));

  const pick = (p, raw) => {
    if (p) {
      setForm(prev => ({
        ...prev,
        product_id: p.id,
        name: p.name || '',
        barcode: p.barcode || '',
        category: p.category || '',
        cost_price: p.cost_price ?? '',
        sale_price: p.sale_price ?? ''
      }));
    } else {
      const s = String(raw || '').trim();
      setForm(prev => ({
        ...prev,
        product_id: '',
        name: s,
        barcode: prev.barcode || s
      }));
    }
    setTimeout(() => qtyRef.current?.focus(), 0);
  };

  useEffect(() => {
    const onScan = (evt) => {
      const code = String(evt?.detail?.code || '').trim();
      const tab = evt?.detail?.tab;
      if (tab && tab !== 'entrada') return;
      if (!code) return;
      const p = (products || []).find(pr => String(pr.barcode || '') === code);
      if (p) {
        setForm(prev => {
          const currentQty = parseInt(String(prev.quantity || '0'), 10) || 0;
          return {
            ...prev,
            product_id: p.id,
            name: p.name || '',
            barcode: p.barcode || '',
            category: p.category || '',
            cost_price: prev.cost_price !== '' ? prev.cost_price : (p.cost_price ?? ''),
            sale_price: prev.sale_price !== '' ? prev.sale_price : (p.sale_price ?? ''),
            quantity: String(Math.max(1, currentQty + 1))
          };
        });
        setTimeout(() => qtyRef.current?.focus(), 0);
        showToast?.('Produto identificado', 'success');
        return;
      }
      showToast?.('Produto não encontrado', 'danger');
      window.dispatchEvent(new CustomEvent('stockentry:new', { detail: { code } }));
    };
    window.addEventListener('scanner:code', onScan);
    return () => window.removeEventListener('scanner:code', onScan);
  }, [products, showToast]);

  const saveMovement = async ({ product_id, quantity, cost_unit }) => {
    const now = new Date().toISOString();
    const pid = (typeof product_id === 'string' && /^\d+$/.test(product_id)) ? product_id : product_id;
    const modern = {
      user_id: userId,
      product_id: pid,
      type: 'entrada',
      quantity: Number(quantity || 0),
      cost_unit: Number(cost_unit || 0),
      occurred_at: now
    };
    const { error } = await supabase.from('stock_movements').insert([modern]);
    if (!error) return true;
    const msg = String(error.message || '').toLowerCase();
    const canFallback = msg.includes('cost_unit') || msg.includes('occurred_at') || msg.includes('column') || msg.includes('schema');
    if (!canFallback) throw error;
    const legacy = {
      user_id: userId,
      product_id: pid,
      type: 'entrada',
      quantity: Number(quantity || 0)
    };
    const { error: err2 } = await supabase.from('stock_movements').insert([legacy]);
    if (err2) throw err2;
    showToast?.('Entrada registrada sem custo (atualize a tabela stock_movements)', 'danger');
    return false;
  };

  const applyOne = async (entry, state) => {
    const qty = Number(entry.quantity || 0);
    const name = String(entry.name || '').trim();
    const barcode = String(entry.barcode || '').trim();
    const category = String(entry.category || '').trim();
    const purchaseCost = Number(entry.cost_price || 0);
    const saleRaw = entry.sale_price;
    if (!(qty > 0) || !(purchaseCost > 0) || !name || !barcode) return { ok: false, reason: 'invalid' };

    const byId = state.byId;
    const byBarcode = state.byBarcode;
    const existingLocal = entry.product_id ? byId.get(String(entry.product_id)) : (barcode ? byBarcode.get(barcode) : null);

    if (demo || userId === 'demo') {
      if (existingLocal?.id) {
        const newQty = Number(existingLocal.quantity || 0) + qty;
        const prevQty = Number(existingLocal.quantity || 0);
        const prevCost = Number(existingLocal.cost_price || 0);
        const avgCost = (prevQty + qty) > 0 ? ((prevCost * prevQty) + (purchaseCost * qty)) / (prevQty + qty) : purchaseCost;
        const patch = { quantity: newQty, cost_price: avgCost };
        const forcedSale = toNum(saleRaw);
        if (saleRaw !== '') patch.sale_price = forcedSale;
        if (category) patch.category = category;
        const updated = demoApi.updateProduct(existingLocal.id, patch) || { ...existingLocal, ...patch };
        state.byId.set(String(existingLocal.id), updated);
        if (updated?.barcode) state.byBarcode.set(String(updated.barcode), updated);
        return { ok: true };
      }
      const created = demoApi.createProduct({
        user_id: 'demo',
        name,
        barcode,
        category,
        quantity: qty,
        cost_price: purchaseCost,
        sale_price: toNum(saleRaw)
      });
      if (created?.id) state.byId.set(String(created.id), created);
      if (created?.barcode) state.byBarcode.set(String(created.barcode), created);
      return { ok: true };
    }

    if (existingLocal?.id) {
      const newQty = Number(existingLocal.quantity || 0) + qty;
      const prevQty = Number(existingLocal.quantity || 0);
      const prevCost = Number(existingLocal.cost_price || 0);
      const avgCost = (prevQty + qty) > 0 ? ((prevCost * prevQty) + (purchaseCost * qty)) / (prevQty + qty) : purchaseCost;
      const patch = { quantity: newQty, cost_price: avgCost };
      const forcedSale = toNum(saleRaw);
      if (saleRaw !== '') {
        patch.sale_price = forcedSale;
      } else {
        const storedMargin = Number(existingLocal.margin || 0);
        let margin = storedMargin;
        if (!(margin > 0)) {
          const prevSale = Number(existingLocal.sale_price || 0);
          const prevCost2 = Number(existingLocal.cost_price || 0);
          if (prevSale > 0) margin = ((prevSale - prevCost2) / prevSale) * 100;
        }
        if (margin > 0 && margin < 99.5) {
          const newSale = avgCost / (1 - margin / 100);
          if (Number.isFinite(newSale) && newSale > 0) patch.sale_price = Number(newSale.toFixed(2));
        }
      }
      if (category) patch.category = category;
      const tryUpdate = async (payload) => supabase.from('products').update(payload).eq('id', existingLocal.id).eq('user_id', userId);
      let { error } = await tryUpdate(patch);
      if (error && String(error.message || '').toLowerCase().includes('category')) {
        const { category, ...rest } = patch;
        ({ error } = await tryUpdate(rest));
      }
      if (error) throw error;
      await saveMovement({ product_id: existingLocal.id, quantity: qty, cost_unit: purchaseCost });
      const updated = { ...existingLocal, ...patch };
      state.byId.set(String(existingLocal.id), updated);
      if (updated?.barcode) state.byBarcode.set(String(updated.barcode), updated);
      return { ok: true };
    }

    const row = {
      user_id: userId,
      name,
      barcode,
      category,
      quantity: qty,
      cost_price: purchaseCost,
      sale_price: toNum(saleRaw)
    };
    if (!row.category) delete row.category;
    const tryInsert = async (payload) => supabase.from('products').insert([payload]).select('id,barcode,quantity,cost_price,sale_price,margin,category,name').maybeSingle();
    let { data, error } = await tryInsert(row);
    if (error && String(error.message || '').toLowerCase().includes('category')) {
      const { category, ...rest } = row;
      ({ data, error } = await tryInsert(rest));
    }
    if (error) throw error;
    await saveMovement({ product_id: data?.id, quantity: qty, cost_unit: purchaseCost });
    if (data?.id) state.byId.set(String(data.id), data);
    if (data?.barcode) state.byBarcode.set(String(data.barcode), data);
    return { ok: true };
  };

  const confirmEntries = async () => {
    if (!userId) { showToast?.('Faça login para registrar entrada', 'danger'); return; }
    if (!entries.length) { showToast?.('Adicione itens à lista antes de confirmar', 'danger'); return; }

    setBusy(true);
    try {
      const base = Array.isArray(products) ? products : [];
      const byId = new Map(base.map(p => [String(p.id), p]));
      const byBarcode = new Map(base.filter(p => p?.barcode).map(p => [String(p.barcode), p]));
      const state = { byId, byBarcode };
      let ok = 0;
      for (const e of entries) {
        const res = await applyOne(e, state);
        if (res.ok) ok += 1;
      }
      setEntries([]);
      clearForm();
      onAfterChange?.();
      showToast?.(`${ok} entradas confirmadas`, 'success');
      try { window.dispatchEvent(new Event('dashboard:refresh')); } catch {}
    } catch (e) {
      showToast?.(e?.message || 'Falha ao registrar entrada', 'danger');
    } finally {
      setBusy(false);
    }
  };

  const badge = existing?.id ? { label: 'Em estoque', cls: 'badge info' } : { label: 'Novo produto', cls: 'badge green' };
  const showNewFields = !existing?.id && (form.name || form.barcode);

  return (
    <div className="card">
      <div className="section-head">
        <div className="section-title">Entrada de estoque</div>
        <div className="section-meta">Monte uma lista e confirme no final</div>
      </div>
      <div className="section-body">
        <div className="form-group">
          <label>Buscar</label>
          <ProductAutocomplete
            products={products}
            value={search}
            onChange={setSearch}
            onPick={pick}
            placeholder="Buscar por nome, código ou código de barras"
          />
        </div>

        {(existing?.id || showNewFields) && (
          <div className="card" style={{ padding: '16px', marginBottom: 12, background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{form.name || existing?.name}</div>
                <div className="helper-text">
                  Código: {form.barcode || existing?.barcode || '—'} | Categoria: {form.category || existing?.category || '—'}
                </div>
                {existing?.id && (
                  <div className="helper-text">
                    Estoque atual: {Number(existing.quantity || 0)} | Venda: {existing.sale_price != null ? `R$ ${Number(existing.sale_price).toFixed(2)}` : '—'}
                  </div>
                )}
              </div>
              <span className={badge.cls}>{badge.label}</span>
            </div>
          </div>
        )}

        {showNewFields && (
          <div className="form-grid">
            <div className="form-group">
              <label>Nome</label>
              <input className="form-input" value={form.name} onChange={(e)=>setField('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Código</label>
              <input className="form-input" value={form.barcode} onChange={(e)=>setField('barcode', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Categoria</label>
              <input className="form-input" value={form.category} onChange={(e)=>setField('category', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Venda</label>
              <input className="form-input" type="number" step="0.01" min="0" value={form.sale_price} onChange={(e)=>setField('sale_price', e.target.value)} />
            </div>
          </div>
        )}

        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="form-group">
            <label>Custo unitário da entrada</label>
            <input className="form-input" style={{ height: 48, fontSize: 16, fontWeight: 700 }} type="number" step="0.01" min="0" value={form.cost_price} onChange={(e)=>setField('cost_price', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Quantidade</label>
            <input ref={qtyRef} className="form-input" style={{ height: 48, fontSize: 18, fontWeight: 700 }} type="number" min="1" value={form.quantity} onChange={(e)=>setField('quantity', e.target.value)} />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-outline" onClick={addToList} disabled={busy || !canAddEntry(form)}>Adicionar à lista</button>
          <button type="button" className="btn-primary" onClick={confirmEntries} disabled={busy || entries.length === 0}>{busy ? 'Salvando...' : `Confirmar entradas (${entries.length})`}</button>
        </div>

        {entries.length > 0 && (
          <div className="card" style={{ padding: '14px', marginTop: 14, background: '#ffffff' }}>
            <div className="section-head" style={{ padding: 0, borderBottom: 'none' }}>
              <div className="section-title">Lista</div>
              <div className="section-meta">{entries.length} itens</div>
            </div>
            <div style={{ overflowX: 'auto', marginTop: 10 }}>
              <table className="products-table" role="table" aria-label="Lista de entradas">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Código</th>
                    <th className="num">Qtd</th>
                    <th className="num">Custo</th>
                    <th className="num">Venda</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, idx) => (
                    <tr key={`${e.barcode}_${idx}`}>
                      <td className="name">{e.name}</td>
                      <td>{e.barcode}</td>
                      <td className="num">{Number(e.quantity || 0)}</td>
                      <td className="num">{Number(e.cost_price || 0).toFixed(2)}</td>
                      <td className="num">{e.sale_price !== '' ? Number(toNum(e.sale_price)).toFixed(2) : '—'}</td>
                      <td className="actions-cell">
                        <button type="button" className="btn-action delete" aria-label="Remover" onClick={()=>removeEntry(idx)}><i className="fas fa-trash"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
