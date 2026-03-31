import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function ProductForm({ onAdd, loading }) {
  const [f, setF] = useState({
    name: '',
    barcode: '',
    category: '',
    cost_price: '',
    margin: '',
    sale_price: ''
  });
  const nameRef = useRef(null);
  const toNum = (v) => {
    const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isNaN(n) ? 0 : n;
  };
  const saleCalc = useMemo(()=>{
    const cost = toNum(f.cost_price);
    const margin = toNum(f.margin);
    if (cost <= 0) return '';
    const p = margin > 0 ? (cost / (1 - margin/100)) : cost;
    return p.toFixed(2);
  }, [f.cost_price, f.margin]);
  useEffect(()=>{ setF(prev => ({ ...prev, sale_price: saleCalc })); }, [saleCalc]);
  const update = (k, v) => setF(prev => ({ ...prev, [k]: v }));
  const clear = () => {
    setF({ name:'', barcode:'', category:'', cost_price:'', margin:'', sale_price:'' });
    setTimeout(()=>nameRef.current?.focus(), 0);
  };
  const submit = (e) => {
    e?.preventDefault?.();
    const payload = {
      name: String(f.name||'').trim(),
      barcode: String(f.barcode||'').trim(),
      quantity: 0,
      cost_price: toNum(f.cost_price),
      sale_price: toNum(f.sale_price),
      category: String(f.category||'').trim()
    };
    onAdd?.(payload, clear);
  };
  return (
    <div className="card">
      <div className="section-head">
        <div className="section-title">Cadastro</div>
        <div className="section-meta">Crie produtos. O estoque é ajustado na tela Entrada</div>
      </div>
      <form className="section-body" onSubmit={submit}>
        <div className="form-grid">
          <div className="form-group">
            <label>Nome</label>
            <input ref={nameRef} className="form-input" value={f.name} onChange={(e)=>update('name', e.target.value)} placeholder="Ex.: Pão francês" />
          </div>
          <div className="form-group">
            <label>Código</label>
            <input className="form-input" value={f.barcode} onChange={(e)=>update('barcode', e.target.value)} placeholder="Código interno ou barras" />
          </div>
          <div className="form-group">
            <label>Categoria</label>
            <input className="form-input" value={f.category} onChange={(e)=>update('category', e.target.value)} placeholder="Ex.: Padaria" />
          </div>
          <div className="form-group">
            <label>Custo (R$)</label>
            <input className="form-input" type="number" step="0.01" min="0" value={f.cost_price} onChange={(e)=>update('cost_price', e.target.value)} placeholder="0,00" />
          </div>
          <div className="form-group">
            <label>Margem (%)</label>
            <input className="form-input" type="number" step="0.01" min="0" value={f.margin} onChange={(e)=>update('margin', e.target.value)} placeholder="Ex.: 20" />
          </div>
          <div className="form-group">
            <label>Preço de venda</label>
            <input className="form-input" type="number" step="0.01" min="0" value={f.sale_price} onChange={(e)=>update('sale_price', e.target.value)} placeholder="Calculado" />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn-outline" onClick={clear}>Limpar</button>
          <button type="submit" className="btn-primary" disabled={loading}>Adicionar produto</button>
        </div>
      </form>
    </div>
  );
}
