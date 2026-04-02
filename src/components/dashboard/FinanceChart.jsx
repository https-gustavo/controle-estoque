import React, { useMemo, useState } from 'react';

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

export default function FinanceChart({ rows, formatCurrency, onEmptyCta }) {
  const [hover, setHover] = useState(null);
  const data = Array.isArray(rows) ? rows : [];
  const hasData = data.some(r => Number(r.revenue || 0) !== 0 || Number(r.expenses || 0) !== 0 || Number(r.purchases || 0) !== 0 || Number(r.profit || 0) !== 0);
  const axisFmt = useMemo(() => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }), []);

  const chart = useMemo(() => {
    const w = 980;
    const h = 360;
    const pad = { l: 80, r: 20, t: 14, b: 36 };
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;
    const xs = data.map((_, i) => pad.l + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW));
    const ysAll = [];
    data.forEach(r => {
      ysAll.push(Number(r.revenue || 0));
      ysAll.push(Number(r.expenses || 0));
      ysAll.push(Number(r.purchases || 0));
      ysAll.push(Number(r.profit || 0));
    });
    const minV = ysAll.length ? Math.min(...ysAll, 0) : 0;
    const maxV = ysAll.length ? Math.max(...ysAll, 0) : 0;
    const niceStep = (raw) => {
      const r = Math.max(1e-9, Number(raw || 0));
      const exp = Math.floor(Math.log10(r));
      const f = r / Math.pow(10, exp);
      const n = f <= 1 ? 1 : (f <= 2 ? 2 : (f <= 5 ? 5 : 10));
      return n * Math.pow(10, exp);
    };

    const yTicks = 4;
    const range = Math.max(1, maxV - minV);
    const step = niceStep(range / yTicks);
    const minY = Math.floor(minV / step) * step;
    const maxY = Math.ceil(maxV / step) * step;

    const y = (v) => {
      const denom = (maxY - minY) || 1;
      const t = (Number(v || 0) - minY) / denom;
      return pad.t + (1 - t) * innerH;
    };
    const points = (key) => data.map((r, i) => `${xs[i]},${y(r[key])}`).join(' ');
    const ticks = Array.from({ length: yTicks + 1 }).map((_, i) => {
      const v = maxY - i * step;
      return { y: y(v), v };
    });
    const zeroY = y(0);
    return { w, h, pad, xs, y, points, ticks, zeroY };
  }, [data]);

  const onMove = (e) => {
    if (!data.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPx = (e.clientX ?? 0) - rect.left;
    const xView = rect.width > 0 ? (xPx / rect.width) * chart.w : xPx;
    const i = Math.round(((xView - chart.pad.l) / (chart.w - chart.pad.l - chart.pad.r)) * (data.length - 1));
    const idx = clamp(i, 0, data.length - 1);
    setHover({ idx, x: chart.xs[idx] });
  };

  if (!hasData) {
    return (
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
          <strong>Receita, despesas, compras e lucro</strong>
          <div className="helper-text">Período diário</div>
        </div>
        <div className="helper-text" style={{ marginBottom: 12 }}>Sem dados no período.</div>
        <button className="btn-primary" onClick={onEmptyCta}>Registrar vendas</button>
      </div>
    );
  }

  const idx = hover?.idx ?? null;
  const row = idx != null ? data[idx] : null;

  return (
    <div className="card" style={{ padding: '1rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
        <strong>Receita, despesas, compras e lucro</strong>
        <div className="helper-text">Período diário</div>
      </div>
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom: 10 }}>
        <span className="badge green">Receita</span>
        <span className="badge red">Despesas</span>
        <span className="badge" style={{ background:'#7c3aed', color:'#fff', borderColor:'#7c3aed' }}>Compras</span>
        <span className="badge info">Lucro</span>
      </div>
      <div style={{ width:'100%', height:360, position:'relative' }}>
        <svg viewBox={`0 0 ${chart.w} ${chart.h}`} width="100%" height="100%" onMouseMove={onMove} onMouseLeave={()=>setHover(null)} style={{ display:'block' }}>
          <defs>
            <linearGradient id="areaProfit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </linearGradient>
          </defs>
          {chart.ticks.map((t, i) => (
            <g key={i}>
              <line x1={chart.pad.l} x2={chart.w - chart.pad.r} y1={t.y} y2={t.y} stroke="#e5e7eb" strokeWidth="1" />
              <text x={chart.pad.l - 12} y={t.y + 4} textAnchor="end" fontSize="11" fill="#6b7280">
                {axisFmt.format(Number(t.v || 0))}
              </text>
            </g>
          ))}
          <line x1={chart.pad.l} x2={chart.w - chart.pad.r} y1={chart.zeroY} y2={chart.zeroY} stroke="#cbd5e1" strokeWidth="1" />
          <polyline points={chart.points('revenue')} fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          <polyline points={chart.points('expenses')} fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          <polyline points={chart.points('purchases')} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          <polyline points={chart.points('profit')} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {hover && (
            <g>
              <line x1={hover.x} x2={hover.x} y1={chart.pad.t} y2={chart.h - chart.pad.b} stroke="#94a3b8" strokeDasharray="4 3" />
              <circle cx={hover.x} cy={chart.y(data[hover.idx].revenue)} r="4" fill="#16a34a" />
              <circle cx={hover.x} cy={chart.y(data[hover.idx].expenses)} r="4" fill="#dc2626" />
              <circle cx={hover.x} cy={chart.y(data[hover.idx].purchases)} r="4" fill="#7c3aed" />
              <circle cx={hover.x} cy={chart.y(data[hover.idx].profit)} r="4" fill="#2563eb" />
            </g>
          )}
          {data.map((r, i) => {
            const last = data.length - 1;
            const step = Math.max(1, Math.ceil(data.length / 8));
            const show = i === 0 || i === last || i % step === 0;
            if (!show) return null;
            const anchor = i === 0 ? 'start' : (i === last ? 'end' : 'middle');
            const dx = i === 0 ? 6 : (i === last ? -6 : 0);
            return (
              <text key={i} x={chart.xs[i] + dx} y={chart.h - 12} textAnchor={anchor} fontSize="11" fill="#6b7280">
                {String(r.day).slice(5)}
              </text>
            );
          })}
        </svg>
        {row && (
          <div style={{ position:'absolute', right: 12, top: 12, background:'#fff', border:'1px solid var(--border-color)', borderRadius: 10, padding:'10px 12px', boxShadow: 'var(--shadow-sm)', minWidth: 240, pointerEvents: 'none' }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{String(row.day).split('-').reverse().join('/')}</div>
            <div className="helper-text" style={{ display:'flex', justifyContent:'space-between' }}><span>Receita</span><span>{formatCurrency(row.revenue || 0)}</span></div>
            <div className="helper-text" style={{ display:'flex', justifyContent:'space-between' }}><span>Despesas</span><span>{formatCurrency(row.expenses || 0)}</span></div>
            <div className="helper-text" style={{ display:'flex', justifyContent:'space-between' }}><span>Compras</span><span>{formatCurrency(row.purchases || 0)}</span></div>
            <div className="helper-text" style={{ display:'flex', justifyContent:'space-between' }}><span>Lucro</span><span style={{ fontWeight: 700, color: Number(row.profit || 0) < 0 ? '#dc2626' : '#16a34a' }}>{formatCurrency(row.profit || 0)}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
