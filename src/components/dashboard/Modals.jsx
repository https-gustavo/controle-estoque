import React from 'react';

export function EntryModal({
  open,
  onClose,
  simpleMode,
  setSimpleMode,
  quickEntry,
  onQuickChange,
  onQuickAdd,
  batchProducts,
  onRemoveRow,
  onSubmit
}) {
  if (!open) return null;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="entry-modal-title">
      <div className="modal batch-modal">
        <div className="modal-header">
          <h2 id="entry-modal-title">Entrada de Produtos</h2>
          <button className="close-btn" aria-label="Fechar" onClick={onClose}>×</button>
        </div>
        <div className={`modal-body ${simpleMode ? 'simple-mode' : ''}`}>
          <div className="mode-switch">
            <button className={`btn-tab ${simpleMode?'active':''}`} onClick={()=>setSimpleMode(true)}>Modo Simples</button>
            <button className={`btn-tab ${!simpleMode?'active':''}`} onClick={()=>setSimpleMode(false)}>Modo Avançado</button>
          </div>

          {simpleMode ? (
            <div className="simple-form card">
              <div className="form-row">
                <div className="form-group"><label>Código</label><input className="form-input" value={quickEntry.barcode} onChange={(e)=>onQuickChange('barcode', e.target.value)} /></div>
                <div className="form-group"><label>Nome</label><input className="form-input" value={quickEntry.name} onChange={(e)=>onQuickChange('name', e.target.value)} /></div>
                <div className="form-group"><label>Qtd</label><input className="form-input" type="number" min="1" value={quickEntry.quantity} onChange={(e)=>onQuickChange('quantity', e.target.value)} /></div>
                <button className="btn-primary" onClick={onQuickAdd}>Adicionar</button>
              </div>
            </div>
          ) : (
            <>
              <div className="quick-add card">
                <div className="form-row">
                  <div className="form-group"><label>Código</label><input className="form-input" value={quickEntry.barcode} onChange={(e)=>onQuickChange('barcode', e.target.value)} /></div>
                  <div className="form-group"><label>Nome</label><input className="form-input" value={quickEntry.name} onChange={(e)=>onQuickChange('name', e.target.value)} /></div>
                  <div className="form-group"><label>Qtd</label><input className="form-input" type="number" min="1" value={quickEntry.quantity} onChange={(e)=>onQuickChange('quantity', e.target.value)} /></div>
                  <div className="form-group"><label>Custo</label><input className="form-input" type="number" step="0.01" value={quickEntry.cost_price} onChange={(e)=>onQuickChange('cost_price', e.target.value)} /></div>
                  <div className="form-group"><label>Venda</label><input className="form-input" type="number" step="0.01" value={quickEntry.sale_price} onChange={(e)=>onQuickChange('sale_price', e.target.value)} /></div>
                  <button className="btn-primary" onClick={onQuickAdd}>Adicionar</button>
                </div>
              </div>

              <div className="totals-grid">
                <div className="total-card"><div className="total-label">Itens</div><div className="total-value">{batchProducts.length}</div></div>
                <div className="total-card"><div className="total-label">Custo Total</div><div className="total-value">{batchProducts.reduce((a,b)=>a+Number(b.cost_price||0)*Number(b.quantity||0),0).toFixed(2)}</div></div>
                <div className="total-card"><div className="total-label">Venda Total</div><div className="total-value">{batchProducts.reduce((a,b)=>a+Number(b.sale_price||0)*Number(b.quantity||0),0).toFixed(2)}</div></div>
                <div className="total-card"><div className="total-label">Margem</div><div className="total-value">{(batchProducts.reduce((a,b)=>a+Number(b.sale_price||0)*Number(b.quantity||0),0) - batchProducts.reduce((a,b)=>a+Number(b.cost_price||0)*Number(b.quantity||0),0)).toFixed(2)}</div></div>
              </div>

              <div className="batch-table-container">
                <table className="batch-table">
                  <thead><tr><th>Código</th><th>Nome</th><th>Qtd</th><th>Custo</th><th>Venda</th><th>Ações</th></tr></thead>
                  <tbody>
                    {batchProducts.map(p=>(
                      <tr key={p.id}>
                        <td>{p.barcode}</td><td>{p.name}</td><td>{p.quantity}</td><td>{p.cost_price}</td><td>{p.sale_price}</td>
                        <td className="actions-cell"><button className="btn-danger" onClick={()=>onRemoveRow(p.id)}><i className="fas fa-trash"></i></button></td>
                      </tr>
                    ))}
                    {batchProducts.length===0 && (<tr><td colSpan="6" style={{ textAlign:'center', color:'var(--text-secondary)' }}>Nenhum item</td></tr>)}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={onSubmit} disabled={batchProducts.length===0}>Processar Entrada</button>
        </div>
      </div>
    </div>
  );
}

export function QuantityModal({ open, selectedProduct, value, onChange, onClose, onSubmit, loading }) {
  if (!open || !selectedProduct) return null;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="quantity-modal-title">
      <div className="modal">
        <div className="modal-header">
          <h2 id="quantity-modal-title">Ajustar Quantidade</h2>
          <button className="close-btn" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <div className="modal-body">
          <p><strong>Produto:</strong> {selectedProduct.name}</p>
          <div className="form-group"><label>Nova quantidade</label><input className="form-input" type="number" min="0" value={value} onChange={(e)=>onChange(e.target.value)} /></div>
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
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="price-modal-title">
      <div className="modal">
        <div className="modal-header">
          <h2 id="price-modal-title">Editar Custos e Preços</h2>
          <button className="close-btn" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <div className="modal-body">
          <p><strong>Produto:</strong> {selectedProduct.name}</p>
          <div className="form-row">
            <div className="form-group"><label>Custo</label><input className="form-input" type="number" step="0.01" value={costValue} onChange={(e)=>setCostValue(e.target.value)} placeholder={`Atual: ${Number(selectedProduct.cost_price||0).toFixed(2)}`} /></div>
            <div className="form-group"><label>Venda</label><input className="form-input" type="number" step="0.01" value={saleValue} onChange={(e)=>setSaleValue(e.target.value)} placeholder={`Atual: ${Number(selectedProduct.sale_price||0).toFixed(2)}`} /></div>
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

