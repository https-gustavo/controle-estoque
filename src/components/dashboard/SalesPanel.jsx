import React from 'react';

export default function SalesPanel({
  saleSearch,
  saleSuggestions,
  saleSuggestionIndex,
  handleQuickSaleSearchChange,
  handleSearchKeyDown,
  handleAddBySearch,
  renderHighlighted,
  addProductToCart,
  salesCart,
  formatCurrency,
  decCartQty,
  incCartQty,
  updateCartQty,
  removeFromCart,
  saleDiscount,
  setSaleDiscount,
  saleDiscountPct,
  setSaleDiscountPct,
  cartSubtotal,
  discountValue,
  cartTotal,
  handleFinalizeSale
}) {
  return (
    <div className="vendas-page">
      <div className="page-header">
        <h2><i className="fas fa-cash-register"></i> Vendas</h2>
        <p className="page-subtitle">Monte o carrinho, aplique desconto e finalize.</p>
      </div>
      <div className="page-box">
        <div className="stack">
          <div className="quick-sale">
            <div className="form-group">
              <label htmlFor="quickSaleSearch">Busca por Nome/Código</label>
              <input
                id="quickSaleSearch"
                type="text"
                value={saleSearch}
                onChange={(e) => handleQuickSaleSearchChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Digite para ver sugestões e pressione Enter"
                className="form-input"
              />
            </div>
            <button className="btn-primary" onClick={handleAddBySearch}>
              <i className="fas fa-plus"></i>
              Adicionar
            </button>
            {saleSuggestions.length > 0 && (
              <div className="suggestions-dropdown">
                {saleSuggestions.map((s, idx) => (
                  <button
                    key={s.id}
                    className={`suggestion-row ${idx === saleSuggestionIndex ? 'active' : ''}`}
                    title={s.name || s.product_name || s.barcode}
                    onClick={() => { addProductToCart(s, 1); }}
                  >
                    <div className="sg-name">{renderHighlighted(String(s.name || s.product_name || s.barcode || ''), saleSearch)}</div>
                    <div className="sg-meta">{formatCurrency(s.sale_price)} • Estoque: {s.quantity}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="sale-items">
            {salesCart.length === 0 ? (
              <p className="helper-text">Nenhum item adicionado à venda</p>
            ) : (
              salesCart.map(item => (
                <div className="sale-chip" key={item.id}>
                  <div className="chip-main">
                    <div className="chip-name">{item.name}</div>
                    <div className="chip-meta">{formatCurrency(item.unit_price)} • {item.barcode}</div>
                  </div>
                  <div className="chip-qty">
                    <button className="btn-outline small" aria-label="Diminuir quantidade" onClick={() => decCartQty(item.id)}>-</button>
                    <input className="qty-input" type="number" min="1" value={item.quantity} aria-label="Quantidade" onChange={(e) => updateCartQty(item.id, e.target.value)} />
                    <button className="btn-outline small" aria-label="Aumentar quantidade" onClick={() => incCartQty(item.id)}>+</button>
                  </div>
                  <div className="chip-total">{formatCurrency(item.unit_price * item.quantity)}</div>
                  <button className="btn-outline small remove" onClick={() => removeFromCart(item.id)} title="Remover" aria-label="Remover item">
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="sale-summary">
            <div className="summary-row"><span>Subtotal</span><strong>{formatCurrency(cartSubtotal)}</strong></div>
            <div className="form-row" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Desconto (R$)</label>
                <input className="form-input" type="number" min="0" step="0.01" value={saleDiscount} onChange={(e) => { setSaleDiscount(e.target.value); if (Number(e.target.value || 0) > 0) setSaleDiscountPct(''); }} />
              </div>
              <div className="form-group">
                <label>Desconto (%)</label>
                <input className="form-input" type="number" min="0" step="0.1" value={saleDiscountPct} onChange={(e) => { setSaleDiscountPct(e.target.value); if (Number(e.target.value || 0) > 0) setSaleDiscount(''); }} />
              </div>
            </div>
            {discountValue > 0 && (
              <div className="summary-row discount-row"><span>Desconto</span><strong>-{formatCurrency(discountValue)}</strong></div>
            )}
            <div className="summary-row total"><span>Total</span><strong>{formatCurrency(cartTotal)}</strong></div>
            <div className="actions">
              <button className="btn-success" onClick={handleFinalizeSale} disabled={salesCart.length === 0}>
                <i className="fas fa-check"></i>
                Finalizar Venda
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
