import React, { useEffect, useState } from 'react';

function toNum(v) {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isNaN(n) ? 0 : n;
}

export default function ProductEditModal({ open, product, onClose, onSave, saving }) {
  const [f, setF] = useState({ name:'', barcode:'', category:'', cost_price:'', sale_price:'' });

  useEffect(() => {
    if (!open || !product) return;
    setF({
      name: product.name || '',
      barcode: product.barcode || '',
      category: product.category || '',
      cost_price: product.cost_price ?? '',
      sale_price: product.sale_price ?? ''
    });
  }, [open, product]);

  if (!open || !product) return null;

  const submit = async () => {
    const patch = {
      name: String(f.name || '').trim(),
      barcode: String(f.barcode || '').trim(),
      category: String(f.category || '').trim(),
      cost_price: toNum(f.cost_price),
      sale_price: toNum(f.sale_price)
    };
    const ok = await onSave?.(product.id, patch);
    if (ok) onClose?.();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="product-edit-title" onClick={onClose}>
      <div className="modal" onClick={(e)=>e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="product-edit-title">Editar produto</h2>
          <button className="close-btn" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label>Nome</label>
              <input className="form-input" value={f.name} onChange={(e)=>setF(prev=>({ ...prev, name:e.target.value }))} />
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
              <label>Venda</label>
              <input className="form-input" type="number" step="0.01" min="0" value={f.sale_price} onChange={(e)=>setF(prev=>({ ...prev, sale_price:e.target.value }))} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-outline" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  );
}

