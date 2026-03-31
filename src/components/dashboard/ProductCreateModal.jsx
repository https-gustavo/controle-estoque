import React, { useEffect, useMemo, useRef, useState } from 'react';

function toNum(v) {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isNaN(n) ? 0 : n;
}

export default function ProductCreateModal({ open, onClose, onCreate, onCreateBatch, busy, initial, categories }) {
  const [f, setF] = useState({ name:'', barcode:'', category:'', cost_price:'', margin:'', sale_price:'', quantity:'' });
  const [saleTouched, setSaleTouched] = useState(false);
  const [items, setItems] = useState([]);
  const nameRef = useRef(null);
  const listId = useMemo(() => `cat_${Math.random().toString(16).slice(2)}`, []);

  const computedSale = useMemo(() => {
    const cost = toNum(f.cost_price);
    const margin = toNum(f.margin);
    if (!(cost > 0) || !(margin > 0) || margin >= 99.5) return '';
    const price = cost / (1 - margin / 100);
    return Number.isFinite(price) ? price.toFixed(2) : '';
  }, [f.cost_price, f.margin, f.sale_price]);

  useEffect(() => {
    if (!open) return;
    const init = initial || {};
    setF({
      name: String(init.name || ''),
      barcode: String(init.barcode || ''),
      category: String(init.category || ''),
      cost_price: init.cost_price != null ? String(init.cost_price) : '',
      margin: init.margin != null ? String(init.margin) : '',
      sale_price: init.sale_price != null ? String(init.sale_price) : '',
      quantity: init.quantity != null ? String(init.quantity) : ''
    });
    setSaleTouched(Boolean(init.sale_price != null && String(init.sale_price) !== ''));
    setItems([]);
    setTimeout(() => nameRef.current?.focus(), 0);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    if (!saleTouched && computedSale && computedSale !== f.sale_price) setF(prev => ({ ...prev, sale_price: computedSale }));
  }, [computedSale, open, saleTouched, f.sale_price]);

  if (!open) return null;

  const normalizePayload = (src) => {
    const payload = {
      name: String(src.name || '').trim(),
      barcode: String(src.barcode || '').trim(),
      category: String(src.category || '').trim(),
      cost_price: toNum(src.cost_price),
      margin: toNum(src.margin),
      sale_price: toNum(src.sale_price),
      quantity: parseInt(String(src.quantity || '0'), 10) || 0
    };
    return payload;
  };

  const canAdd = () => {
    const p = normalizePayload(f);
    if (!p.name) return false;
    if (!(p.cost_price > 0)) return false;
    return true;
  };

  const addToList = () => {
    if (!canAdd()) return;
    const p = normalizePayload(f);
    setItems(prev => [...prev, p]);
    setF(prev => ({
      ...prev,
      name: '',
      barcode: '',
      cost_price: '',
      margin: '',
      sale_price: saleTouched ? '' : prev.sale_price,
      quantity: ''
    }));
    setSaleTouched(false);
    setTimeout(() => nameRef.current?.focus(), 0);
  };

  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const submit = (e) => {
    e?.preventDefault?.();
    const batch = [...items];
    if (canAdd()) {
      const current = normalizePayload(f);
      const last = batch[batch.length - 1];
      const sameAsLast = last && last.name === current.name && last.barcode === current.barcode && last.cost_price === current.cost_price && last.margin === current.margin && last.sale_price === current.sale_price && last.quantity === current.quantity && last.category === current.category;
      if (!sameAsLast) batch.push(current);
    }
    if (batch.length > 1) {
      onCreateBatch?.(batch);
      return;
    }
    if (batch.length === 1) {
      onCreate?.(batch[0]);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-create-title"
      tabIndex={-1}
      onKeyDown={(e)=>{ if (e.key === 'Escape') onClose?.(); }}
      onClick={onClose}
    >
      <div className="modal" onClick={(e)=>e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="product-create-title">Cadastro de produtos</h2>
          <button className="close-btn" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <form className="modal-body" onSubmit={submit} onKeyDown={(e)=>{ if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { submit(e); } }}>
          <div className="card" style={{ padding: 14, marginBottom: 12, background: '#fff' }}>
            <div className="section-head" style={{ padding: 0, borderBottom: 'none' }}>
              <div className="section-title">Informações básicas</div>
              <div className="section-meta">Adicione itens à lista e confirme no final</div>
            </div>
            <div className="form-grid" style={{ marginTop: 10 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Nome *</label>
                <input ref={nameRef} className="form-input" value={f.name} onChange={(e)=>setF(prev=>({ ...prev, name:e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Código</label>
                <input className="form-input" value={f.barcode} onChange={(e)=>setF(prev=>({ ...prev, barcode:e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Categoria</label>
                <input className="form-input" list={listId} value={f.category} onChange={(e)=>setF(prev=>({ ...prev, category:e.target.value }))} />
                <datalist id={listId}>
                  {(Array.isArray(categories) ? categories : []).map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="form-group">
                <label>Quantidade inicial</label>
                <input className="form-input" type="number" min="0" value={f.quantity} onChange={(e)=>setF(prev=>({ ...prev, quantity:e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 14, marginBottom: 12, background: '#fff' }}>
            <div className="section-head" style={{ padding: 0, borderBottom: 'none' }}>
              <div className="section-title">Preço</div>
              <div className="section-meta">Venda é calculada por custo e margem</div>
            </div>
            <div className="form-grid" style={{ marginTop: 10 }}>
              <div className="form-group">
                <label>Custo (R$) *</label>
                <input className="form-input" type="number" step="0.01" min="0" value={f.cost_price} onChange={(e)=>{ setF(prev=>({ ...prev, cost_price:e.target.value })); }} />
              </div>
              <div className="form-group">
                <label title="Margem (%): lucro sobre a venda. Ex.: 20% => venda = custo / (1 - 0,20)">Margem (%)</label>
                <input className="form-input" type="number" step="0.1" min="0" value={f.margin} onChange={(e)=>{ setF(prev=>({ ...prev, margin:e.target.value })); }} />
              </div>
              <div className="form-group">
                <label>Preço de venda</label>
                <input className="form-input" type="number" step="0.01" min="0" value={f.sale_price} onChange={(e)=>{ setSaleTouched(true); setF(prev=>({ ...prev, sale_price:e.target.value })); }} />
              </div>
            </div>
            {saleTouched && (
              <div className="helper-text" style={{ marginTop: 10 }}>
                Preço editado manualmente. Para voltar ao cálculo automático, limpe o campo ou ajuste custo/margem.
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="card" style={{ padding: 14, background: '#fff' }}>
              <div className="section-head" style={{ padding: 0, borderBottom: 'none' }}>
                <div className="section-title">Lista ({items.length})</div>
                <div className="section-meta">Itens prontos para criar</div>
              </div>
              <div style={{ overflowX: 'auto', marginTop: 10 }}>
                <table className="products-table" role="table" aria-label="Lista de produtos">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Código</th>
                      <th>Categoria</th>
                      <th className="num">Qtd</th>
                      <th className="num">Custo</th>
                      <th className="num">Margem</th>
                      <th className="num">Venda</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={`${it.barcode || it.name}_${idx}`}>
                        <td className="name">{it.name}</td>
                        <td>{it.barcode || '—'}</td>
                        <td>{it.category || '—'}</td>
                        <td className="num">{Number(it.quantity || 0)}</td>
                        <td className="num">{Number(it.cost_price || 0).toFixed(2)}</td>
                        <td className="num">{it.margin ? `${Number(it.margin).toFixed(1)}%` : '—'}</td>
                        <td className="num">{it.sale_price ? Number(it.sale_price).toFixed(2) : '—'}</td>
                        <td className="actions-cell">
                          <button type="button" className="btn-action delete" aria-label="Remover" onClick={()=>removeItem(idx)}><i className="fas fa-trash"></i></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </form>
        <div className="modal-footer">
          <button type="button" className="btn-outline" onClick={addToList} disabled={busy || !canAdd()}>Adicionar à lista</button>
          <button type="button" className="btn-outline" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="btn-primary" onClick={submit} disabled={busy || (items.length === 0 && !canAdd())}>
            {busy ? 'Salvando...' : (items.length > 0 ? `Criar ${items.length + (canAdd() ? 1 : 0)} produtos` : 'Criar produto')}
          </button>
        </div>
      </div>
    </div>
  );
}
