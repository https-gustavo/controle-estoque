import React from 'react';

export function QuantityModal({ open, selectedProduct, value, onChange, onClose, onSubmit, loading }) {
  if (!open || !selectedProduct) return null;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="quantity-modal-title" tabIndex={-1} onKeyDown={(e)=>{ if (e.key === 'Escape') onClose?.(); }} onClick={onClose}>
      <div className="modal" onClick={(e)=>e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="quantity-modal-title">Ajustar Quantidade</h2>
          <button className="close-btn" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <div className="modal-body">
          <p><strong>Produto:</strong> {selectedProduct.name}</p>
          <div className="form-group"><label>Nova quantidade</label><input className="form-input" type="number" min="0" value={value} aria-label="Nova quantidade" onChange={(e)=>onChange(e.target.value)} /></div>
        </div>
        <div className="modal-footer">
          <button className="btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={onSubmit} disabled={loading}>Atualizar</button>
        </div>
      </div>
    </div>
  );
}

export function PriceModal({ open, selectedProduct, costValue, saleValue, setCostValue, setSaleValue, onClose, onSubmit, loading }) {
  if (!open || !selectedProduct) return null;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="price-modal-title" tabIndex={-1} onKeyDown={(e)=>{ if (e.key === 'Escape') onClose?.(); }} onClick={onClose}>
      <div className="modal" onClick={(e)=>e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="price-modal-title">Editar Custos e Preços</h2>
          <button className="close-btn" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <div className="modal-body">
          <p><strong>Produto:</strong> {selectedProduct.name}</p>
          <div className="form-row">
            <div className="form-group"><label>Custo</label><input className="form-input" type="number" step="0.01" value={costValue} aria-label="Custo" onChange={(e)=>setCostValue(e.target.value)} placeholder={`Atual: ${Number(selectedProduct.cost_price||0).toFixed(2)}`} /></div>
            <div className="form-group"><label>Venda</label><input className="form-input" type="number" step="0.01" value={saleValue} aria-label="Venda" onChange={(e)=>setSaleValue(e.target.value)} placeholder={`Atual: ${Number(selectedProduct.sale_price||0).toFixed(2)}`} /></div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={onSubmit} disabled={loading}>Atualizar</button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmSaleModal({
  open,
  items,
  subtotal,
  discount,
  total,
  formatCurrency,
  onClose,
  onConfirm,
  busy
}) {
  if (!open) return null;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-sale-title" tabIndex={-1} onKeyDown={(e)=>{ if (e.key === 'Escape') onClose?.(); }} onClick={onClose}>
      <div className="modal" onClick={(e)=>e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="confirm-sale-title"><i className="fas fa-receipt"></i> Confirmar Venda</h2>
          <button className="close-btn" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <div className="modal-body">
          {items.length === 0 ? (
            <p className="helper-text">Nenhum item no carrinho.</p>
          ) : (
            <div className="table-responsive">
              <table className="products-table">
                <thead><tr><th>Produto</th><th>Código</th><th>Qtd</th><th>Unitário</th><th>Total</th></tr></thead>
                <tbody>
                  {items.map(i=>(
                    <tr key={i.id}>
                      <td>{i.name}</td>
                      <td>{i.barcode || '—'}</td>
                      <td>{i.quantity}</td>
                      <td>{formatCurrency(i.unit_price)}</td>
                      <td>{formatCurrency(i.unit_price * i.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="sale-summary" style={{ marginTop: 12 }}>
            <div className="summary-row"><span>Subtotal</span><strong>{formatCurrency(subtotal)}</strong></div>
            {Number(discount||0) > 0 && (<div className="summary-row discount-row"><span>Desconto</span><strong>-{formatCurrency(discount)}</strong></div>)}
            <div className="summary-row"><span>Total</span><strong>{formatCurrency(total)}</strong></div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-outline" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="btn-success" onClick={onConfirm} disabled={busy || items.length===0}>
            {busy ? 'Processando...' : 'Confirmar e Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
