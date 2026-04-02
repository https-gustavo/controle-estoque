import React, { useEffect, useRef, useState } from 'react';

function toNum(v) {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isNaN(n) ? 0 : n;
}

export default function ProductEditModal({ open, product, onClose, onSave, saving }) {
  const [f, setF] = useState({ name:'', barcode:'', category:'', cost_price:'', sale_price:'' });
  const [keepMargin, setKeepMargin] = useState(true);
  const initialRef = useRef(null);

  useEffect(() => {
    if (!open || !product) return;
    initialRef.current = {
      cost_price: Number(product.cost_price || 0),
      sale_price: Number(product.sale_price || 0),
      margin: product.margin != null ? Number(product.margin) : null
    };
    setF({
      name: product.name || '',
      barcode: product.barcode || '',
      category: product.category || '',
      cost_price: product.cost_price ?? '',
      sale_price: product.sale_price ?? ''
    });
    setKeepMargin(true);
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
    const init = initialRef.current;
    if (keepMargin && init) {
      const nextCost = Number(patch.cost_price || 0);
      const nextSale = Number(patch.sale_price || 0);
      const prevCost = Number(init.cost_price || 0);
      const prevSale = Number(init.sale_price || 0);
      const costChanged = Math.abs(nextCost - prevCost) > 1e-9;
      const saleChanged = Math.abs(nextSale - prevSale) > 1e-9;
      if (costChanged && !saleChanged) {
        const stored = init.margin != null ? Number(init.margin) : 0;
        let margin = stored;
        if (!(margin > 0)) {
          if (prevSale > 0) margin = ((prevSale - prevCost) / prevSale) * 100;
        }
        if (margin > 0 && margin < 99.5 && nextCost > 0) {
          const newSale = nextCost / (1 - margin / 100);
          if (Number.isFinite(newSale) && newSale > 0) patch.sale_price = Number(newSale.toFixed(2));
        }
      }
    }
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
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label style={{ display:'flex', alignItems:'center', gap: 10 }}>
                <input type="checkbox" checked={keepMargin} onChange={(e)=>setKeepMargin(e.target.checked)} />
                <span>Manter margem ao alterar custo</span>
              </label>
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

