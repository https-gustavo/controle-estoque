import React, { useEffect, useMemo, useRef, useState } from 'react';
import ProductAutocomplete from './ProductAutocomplete';

function toNum(v) {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isNaN(n) ? 0 : n;
}

export default function StockEntryForm({ supabase, userId, products, onAfterChange, showToast }) {
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

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
    try {
      const now = new Date().toISOString();
      const modern = {
        user_id: userId,
        product_id,
        type: 'entrada',
        quantity: Number(quantity || 0),
        cost_unit: Number(cost_unit || 0),
        occurred_at: now
      };
      const legacy = {
        user_id: userId,
        product_id,
        type: 'entrada',
        quantity: Number(quantity || 0)
      };
      let { error } = await supabase.from('stock_movements').insert([modern]);
      if (error) {
        ({ error } = await supabase.from('stock_movements').insert([legacy]));
      }
      if (error) return;
    } catch {}
  };

  const submit = async () => {
    if (!userId) { showToast?.('Faça login para registrar entrada', 'danger'); return; }
    const qty = parseInt(form.quantity || '0', 10) || 0;
    if (qty <= 0) { showToast?.('Informe uma quantidade válida', 'danger'); return; }
    const name = String(form.name || '').trim();
    const barcode = String(form.barcode || '').trim();
    if (!name) { showToast?.('Informe o nome do produto', 'danger'); return; }
    if (!barcode) { showToast?.('Informe o código ou código de barras', 'danger'); return; }
    const purchaseCost = toNum(form.cost_price);
    if (!(purchaseCost > 0)) { showToast?.('Informe o custo unitário da entrada', 'danger'); return; }

    setBusy(true);
    try {
      if (existing?.id) {
        const newQty = Number(existing.quantity || 0) + qty;
        const prevQty = Number(existing.quantity || 0);
        const prevCost = Number(existing.cost_price || 0);
        const avgCost = (prevQty + qty) > 0 ? ((prevCost * prevQty) + (purchaseCost * qty)) / (prevQty + qty) : purchaseCost;
        const patch = { quantity: newQty, cost_price: avgCost };
        const forcedSale = toNum(form.sale_price);
        if (form.sale_price !== '') {
          patch.sale_price = forcedSale;
        } else {
          const storedMargin = Number(existing.margin || 0);
          let margin = storedMargin;
          if (!(margin > 0)) {
            const prevSale = Number(existing.sale_price || 0);
            const prevCost2 = Number(existing.cost_price || 0);
            if (prevSale > 0) margin = ((prevSale - prevCost2) / prevSale) * 100;
          }
          if (margin > 0 && margin < 99.5) {
            const newSale = avgCost / (1 - margin / 100);
            if (Number.isFinite(newSale) && newSale > 0) patch.sale_price = Number(newSale.toFixed(2));
          }
        }
        if (form.category) patch.category = String(form.category).trim();
        const tryUpdate = async (payload) => supabase.from('products').update(payload).eq('id', existing.id).eq('user_id', userId);
        let { error } = await tryUpdate(patch);
        if (error && String(error.message || '').toLowerCase().includes('category')) {
          const { category, ...rest } = patch;
          ({ error } = await tryUpdate(rest));
        }
        if (error) throw error;
        await saveMovement({ product_id: existing.id, quantity: qty, cost_unit: purchaseCost });
        showToast?.('Entrada registrada', 'success');
      } else {
        const row = {
          user_id: userId,
          name,
          barcode,
          quantity: qty,
          cost_price: purchaseCost,
          sale_price: toNum(form.sale_price)
        };
        if (form.category) row.category = String(form.category).trim();
        const tryInsert = async (payload) => supabase.from('products').insert([payload]).select('id').maybeSingle();
        let { data, error } = await tryInsert(row);
        if (error && String(error.message || '').toLowerCase().includes('category')) {
          const { category, ...rest } = row;
          ({ data, error } = await tryInsert(rest));
        }
        if (error) throw error;
        await saveMovement({ product_id: data?.id, quantity: qty, cost_unit: purchaseCost });
        showToast?.('Produto criado e entrada registrada', 'success');
      }
      setForm({ product_id:'', name:'', barcode:'', category:'', quantity:'', cost_price:'', sale_price:'' });
      onAfterChange?.();
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
        <div className="section-meta">Busque um produto e adicione quantidade</div>
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
          <button className="btn-primary" onClick={submit} disabled={busy}>{busy ? 'Salvando...' : 'Confirmar entrada'}</button>
        </div>
      </div>
    </div>
  );
}
