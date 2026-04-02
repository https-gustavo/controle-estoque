import React, { useMemo, useState } from 'react';
import ProductAutocomplete from './ProductAutocomplete';

function toNum(v) {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isNaN(n) ? 0 : n;
}

export default function PricingPanel({ products, formatCurrency, onUpdate, showToast }) {
  const [picked, setPicked] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [rawCost, setRawCost] = useState('');
  const [rawSale, setRawSale] = useState('');
  const [rawMargin, setRawMargin] = useState('30');
  const [rawMarkup, setRawMarkup] = useState('');

  const cost = toNum(rawCost);
  const sale = toNum(rawSale);
  const profitUnit = sale - cost;
  const marginPct = sale > 0 ? (profitUnit / sale) * 100 : null;
  const markupPct = cost > 0 ? (profitUnit / cost) * 100 : null;

  const suggestionByMargin = useMemo(() => {
    const m = toNum(rawMargin);
    if (!(cost > 0) || !(m > 0) || m >= 99.5) return null;
    const s = cost / (1 - m / 100);
    return Number.isFinite(s) && s > 0 ? s : null;
  }, [cost, rawMargin]);

  const suggestionByMarkup = useMemo(() => {
    const m = toNum(rawMarkup);
    if (!(cost > 0) || !(m > 0)) return null;
    const s = cost * (1 + m / 100);
    return Number.isFinite(s) && s > 0 ? s : null;
  }, [cost, rawMarkup]);

  const onPick = (p, raw) => {
    setPicked(p || null);
    setProductSearch(p ? (p.name || '') : (raw || ''));
    if (!p) return;
    setRawCost(String(p.cost_price ?? ''));
    setRawSale(String(p.sale_price ?? ''));
  };

  const applyMargin = () => {
    if (!(cost > 0)) { showToast?.('Informe um custo válido', 'danger'); return; }
    const s = suggestionByMargin;
    if (!(s > 0)) { showToast?.('Informe uma margem válida', 'danger'); return; }
    setRawSale(String(Number(s.toFixed(2))));
  };

  const applyMarkup = () => {
    if (!(cost > 0)) { showToast?.('Informe um custo válido', 'danger'); return; }
    const s = suggestionByMarkup;
    if (!(s > 0)) { showToast?.('Informe um markup válido', 'danger'); return; }
    setRawSale(String(Number(s.toFixed(2))));
  };

  const applyToProduct = async () => {
    if (!picked?.id) { showToast?.('Selecione um produto', 'danger'); return; }
    if (!(sale > 0)) { showToast?.('Informe um preço de venda válido', 'danger'); return; }
    const ok = await onUpdate?.(picked.id, { sale_price: Number(sale.toFixed(2)) });
    if (ok) showToast?.('Preço de venda atualizado', 'success');
  };

  return (
    <div className="page-box">
      <div className="page-header">
        <div>
          <h2>Precificação</h2>
          <p className="page-subtitle">Calculadora para sugerir preço de venda e margem</p>
        </div>
      </div>

      <div className="stack">
        <div className="card">
          <div className="section-head">
            <div className="section-title">Produto (opcional)</div>
            <div className="section-meta">Selecionar preenche custo e venda automaticamente</div>
          </div>
          <div className="section-body">
            <ProductAutocomplete
              products={products}
              value={productSearch}
              onChange={setProductSearch}
              onPick={onPick}
              placeholder="Buscar produto para precificar"
            />
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <div className="section-title">Custo e venda</div>
            <div className="section-meta">A partir desses valores o sistema calcula lucro, margem e markup</div>
          </div>
          <div className="section-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Custo (R$)</label>
                <input className="form-input" type="number" min="0" step="0.01" value={rawCost} onChange={(e)=>setRawCost(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Preço de venda (R$)</label>
                <input className="form-input" type="number" min="0" step="0.01" value={rawSale} onChange={(e)=>setRawSale(e.target.value)} />
              </div>
            </div>

            <div className="totals-grid" style={{ marginTop: 12 }}>
              <div className="total-card">
                <div className="total-label">Lucro unitário</div>
                <div className="total-value">{formatCurrency(profitUnit)}</div>
              </div>
              <div className="total-card">
                <div className="total-label">Margem (sobre venda)</div>
                <div className="total-value">{marginPct == null ? '—' : `${marginPct.toFixed(1)}%`}</div>
              </div>
              <div className="total-card">
                <div className="total-label">Markup (sobre custo)</div>
                <div className="total-value">{markupPct == null ? '—' : `${markupPct.toFixed(1)}%`}</div>
              </div>
            </div>

            <div className="form-actions" style={{ justifyContent:'flex-end' }}>
              <button className="btn-primary" type="button" onClick={applyToProduct} disabled={!picked?.id || !(sale > 0)}>
                Aplicar no produto
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <div className="section-title">Sugestão por margem</div>
            <div className="section-meta">Mantém uma margem alvo sobre o preço de venda</div>
          </div>
          <div className="section-body">
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label>Margem desejada (%)</label>
                <input className="form-input" type="number" min="0" step="0.1" value={rawMargin} onChange={(e)=>setRawMargin(e.target.value)} />
              </div>
              <div className="form-group" style={{ minWidth: 220 }}>
                <label>Venda sugerida</label>
                <div className="form-input" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span>{suggestionByMargin ? formatCurrency(suggestionByMargin) : '—'}</span>
                  <button className="btn-outline small" type="button" onClick={applyMargin} disabled={!(suggestionByMargin > 0)}>
                    Usar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <div className="section-title">Sugestão por markup</div>
            <div className="section-meta">Define aumento percentual sobre o custo</div>
          </div>
          <div className="section-body">
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label>Markup desejado (%)</label>
                <input className="form-input" type="number" min="0" step="0.1" value={rawMarkup} onChange={(e)=>setRawMarkup(e.target.value)} />
              </div>
              <div className="form-group" style={{ minWidth: 220 }}>
                <label>Venda sugerida</label>
                <div className="form-input" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span>{suggestionByMarkup ? formatCurrency(suggestionByMarkup) : '—'}</span>
                  <button className="btn-outline small" type="button" onClick={applyMarkup} disabled={!(suggestionByMarkup > 0)}>
                    Usar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
