import React, { useEffect, useMemo, useRef, useState } from 'react';

function toNum(v) {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isNaN(n) ? 0 : n;
}

export default function ProductCreateModal({ open, onClose, onCreate, busy, initial }) {
  const [f, setF] = useState({ name:'', barcode:'', category:'', cost_price:'', margin:'', sale_price:'' });
  const nameRef = useRef(null);

  const computedSale = useMemo(() => {
    const cost = toNum(f.cost_price);
    const margin = toNum(f.margin);
    if (!cost || !margin) return f.sale_price;
    const price = cost / (1 - margin / 100);
    return Number.isFinite(price) ? price.toFixed(2) : f.sale_price;
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
      sale_price: init.sale_price != null ? String(init.sale_price) : ''
    });
    setTimeout(() => nameRef.current?.focus(), 0);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    if (computedSale !== f.sale_price) setF(prev => ({ ...prev, sale_price: computedSale }));
  }, [computedSale, open]);

  if (!open) return null;

  const submit = (e) => {
    e?.preventDefault?.();
    const payload = {
      name: String(f.name || '').trim(),
      barcode: String(f.barcode || '').trim(),
      category: String(f.category || '').trim(),
      cost_price: toNum(f.cost_price),
      margin: toNum(f.margin),
      sale_price: toNum(f.sale_price),
      quantity: 0
    };
    if (!payload.name) return;
    if (!(payload.cost_price > 0)) return;
    onCreate?.(payload);
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
          <h2 id="product-create-title">Novo produto</h2>
          <button className="close-btn" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <form className="modal-body" onSubmit={submit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Nome</label>
              <input ref={nameRef} className="form-input" value={f.name} onChange={(e)=>setF(prev=>({ ...prev, name:e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Código</label>
              <input className="form-input" value={f.barcode} onChange={(e)=>setF(prev=>({ ...prev, barcode:e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Categoria</label>
              <input className="form-input" value={f.category} onChange={(e)=>setF(prev=>({ ...prev, category:e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Custo</label>
              <input className="form-input" type="number" step="0.01" min="0" value={f.cost_price} onChange={(e)=>setF(prev=>({ ...prev, cost_price:e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Margem (%)</label>
              <input className="form-input" type="number" step="0.1" min="0" value={f.margin} onChange={(e)=>setF(prev=>({ ...prev, margin:e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Venda</label>
              <input className="form-input" type="number" step="0.01" min="0" value={f.sale_price} onChange={(e)=>setF(prev=>({ ...prev, sale_price:e.target.value }))} />
            </div>
          </div>
        </form>
        <div className="modal-footer">
          <button className="btn-outline" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="btn-primary" onClick={submit} disabled={busy || !String(f.name||'').trim() || !(toNum(f.cost_price) > 0)}>{busy ? 'Salvando...' : 'Criar produto'}</button>
        </div>
      </div>
    </div>
  );
}
