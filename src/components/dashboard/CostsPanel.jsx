import React from 'react';

export default function CostsPanel({
  calcSearch,
  setCalcSearch,
  calcSuggestOpen,
  setCalcSuggestOpen,
  calcMatches,
  setCalcProductId,
  setCostBase,
  selectedCalcProduct,
  formatCurrency,
  baseCosts,
  freight, setFreight,
  packaging, setPackaging,
  otherCosts, setOtherCosts,
  otherCostsPercent, setOtherCostsPercent,
  calcSimpleMode, setCalcSimpleMode,
  taxTotal, setTaxTotal,
  icms, setIcms,
  ipi, setIpi,
  pis, setPis,
  cofins, setCofins,
  iss, setIss,
  costBase,
  calcMode, setCalcMode,
  targetMargin, setTargetMargin,
  salePriceInput, setSalePriceInput,
  costWithTaxes,
  effectiveSalePrice,
  effectiveMargin,
  handleApplyCalculatedPrices
}) {
  return (
    <div className="calculator-page">
      <div className="page-header">
        <h2><i className="fas fa-calculator"></i> Cálculo de Custo e Preço de Venda</h2>
        <p className="page-subtitle">Defina custos, impostos e margens; aplique ao produto.</p>
      </div>
      <div className="page-box">
      <div className="calc-grid">
        <div className="calc-card card">
          <h3>Entradas</h3>
          <div className="form-group calc-search-group">
            <label>Buscar produto por código ou nome</label>
            <input
              type="text"
              className="form-input"
              placeholder="Digite código de barras ou nome"
              value={calcSearch}
              onChange={(e)=>{ setCalcSearch(e.target.value); setCalcSuggestOpen(true); }}
              onFocus={()=> setCalcSuggestOpen(true)}
              onBlur={()=> setTimeout(()=>setCalcSuggestOpen(false), 150)}
            />
            {calcSuggestOpen && calcMatches.length > 0 && (
              <div className="suggestions-dropdown">
                {calcMatches.slice(0, 8).map((p) => (
                  <div
                    key={p.id ?? p.barcode}
                    className="suggestion-row"
                    onMouseDown={() => {
                      setCalcProductId(String(p.id ?? p.barcode ?? ''));
                      setCalcSearch(`${p.barcode ? p.barcode + ' — ' : ''}${p.name ?? ''}`);
                      setCalcSuggestOpen(false);
                      const cost = p.cost_price ?? p.last_purchase_value ?? p.sale_price ?? 0;
                      setCostBase(String(cost ?? ''));
                    }}
                  >
                    <div className="sg-name">{p.name || 'Sem nome'}</div>
                    <div className="sg-meta">{p.barcode || ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedCalcProduct && (
            <div className="product-summary">
              <div className="summary-item"><span>Produto:</span><strong>{selectedCalcProduct.name}</strong></div>
              {selectedCalcProduct.barcode && (
                <div className="summary-item"><span>Código:</span><strong>{selectedCalcProduct.barcode}</strong></div>
              )}
              <div className="summary-item"><span>Último custo:</span><strong>{formatCurrency(selectedCalcProduct.cost_price ?? selectedCalcProduct.last_purchase_value ?? 0)}</strong></div>
            </div>
          )}
          <div className="form-group"><label>Preço de compra</label><input type="number" step="0.01" className="form-input" value={costBase} onChange={(e)=>setCostBase(e.target.value)} /></div>
          <div className="form-group"><label>Frete</label><input type="number" step="0.01" className="form-input" value={freight} onChange={(e)=>setFreight(e.target.value)} /></div>
          <div className="form-group"><label>Embalagem</label><input type="number" step="0.01" className="form-input" value={packaging} onChange={(e)=>setPackaging(e.target.value)} /></div>
          <div className="form-group"><label>Outros custos</label><input type="number" step="0.01" className="form-input" value={otherCosts} onChange={(e)=>setOtherCosts(e.target.value)} /></div>
          <div className="form-group"><label>Outros custos (%)</label><input type="number" step="0.01" className="form-input" value={otherCostsPercent} onChange={(e)=>setOtherCostsPercent(e.target.value)} placeholder="Ex.: 5 (para royalty)" /></div>
          <div className="divider"></div>
          <h4>Impostos</h4>
          {calcSimpleMode ? (
            <div className="form-group"><label>Impostos totais (%)</label><input type="number" step="0.01" className="form-input" value={taxTotal} onChange={(e)=>setTaxTotal(e.target.value)} placeholder="Ex.: 10" /></div>
          ) : (
            <div className="tax-grid">
              <div className="form-group"><label>ICMS (%)</label><input type="number" step="0.01" className="form-input" value={icms} onChange={(e)=>setIcms(e.target.value)} /></div>
              <div className="form-group"><label>IPI (%)</label><input type="number" step="0.01" className="form-input" value={ipi} onChange={(e)=>setIpi(e.target.value)} /></div>
              <div className="form-group"><label>PIS (%)</label><input type="number" step="0.01" className="form-input" value={pis} onChange={(e)=>setPis(e.target.value)} /></div>
              <div className="form-group"><label>COFINS (%)</label><input type="number" step="0.01" className="form-input" value={cofins} onChange={(e)=>setCofins(e.target.value)} /></div>
              <div className="form-group"><label>ISS (%)</label><input type="number" step="0.01" className="form-input" value={iss} onChange={(e)=>setIss(e.target.value)} /></div>
            </div>
          )}
          <div className="divider"></div>
          <div className="mode-group">
            <label className={"mode-label"}>Modo de cálculo</label>
            <div className="mode-options">
              <label><input type="radio" name="calcMode" checked={calcMode==='margin'} onChange={()=>setCalcMode('margin')} /> Margem desejada</label>
              <label><input type="radio" name="calcMode" checked={calcMode==='reverse'} onChange={()=>setCalcMode('reverse')} /> Margem a partir do preço de venda</label>
            </div>
          </div>
          {calcMode === 'margin' && (
            <div className="form-group"><label>Margem desejada (%)</label><input type="number" step="0.01" className="form-input" value={targetMargin} onChange={(e)=>setTargetMargin(e.target.value)} /></div>
          )}
          {calcMode === 'reverse' && (
            <div className="form-group"><label>Preço de venda</label><input type="number" step="0.01" className="form-input" value={salePriceInput} onChange={(e)=>setSalePriceInput(e.target.value)} /></div>
          )}
        </div>

        <div className="calc-card card">
          <h3>Resultados</h3>
          <div className="summary-row"><span>Custo base</span><strong>{formatCurrency(baseCosts)}</strong></div>
          <div className="summary-row"><span>Impostos (alíquota total)</span><strong>{isFinite(((effectiveSalePrice - baseCosts) / (effectiveSalePrice || 1)) * 100) ? ((effectiveSalePrice - baseCosts) / (effectiveSalePrice || 1) * 100).toFixed(2) : '—'}%</strong></div>
          <div className="summary-row"><span>Custo com impostos</span><strong>{formatCurrency(costWithTaxes)}</strong></div>
          <div className="divider"></div>
          <div className="summary-row"><span>Preço de venda calculado</span><strong>{formatCurrency(effectiveSalePrice)}</strong></div>
          <div className="summary-row"><span>Margem efetiva</span><strong>{isFinite(effectiveMargin) ? `${effectiveMargin.toFixed(2)}%` : '-'}</strong></div>
          <div className="calc-actions">
            <div className="divider"></div>
            <button className="btn-success" onClick={handleApplyCalculatedPrices}>
              <i className="fas fa-check"></i>
              Aplicar ao Produto
            </button>
          </div>
        </div>
      </div>
      <div className="tips card subtle">
        <h4>Dicas rápidas</h4>
        <ul className="tips-list">
          <li>Modo simples: informe apenas o total de impostos (%) sem detalhar ICMS/PIS/COFINS/ISS.</li>
          <li>Digite o nome ou código do produto para preencher automaticamente o preço de compra.</li>
          <li>Margem desejada: calcula o preço final para atingir a margem informada.</li>
          <li>Margem a partir do preço: informe um preço de venda e veja a margem efetiva.</li>
        </ul>
      </div>
      </div>
    </div>
  );
}
