import React, { useMemo, useRef, useState } from 'react';

export default function SalesChart({ daily, formatCurrency, mode='revenue', onEmptyCta }) {
  const data = useMemo(()=> daily.map(d=>({ x: d.day, y: mode==='revenue' ? d.total : d.items })), [daily, mode]);
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);
  const maxY = Math.max(10, ...data.map(d=>d.y));
  const yTicks = useMemo(()=>{
    const steps = 4; const arr=[];
    for(let i=0;i<=steps;i++){ const v = Math.round((maxY/steps)*i); arr.push(v); }
    return arr;
  },[maxY]);
  if (!data || data.length === 0) {
    return (
      <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
        <div className="helper-text">Sem dados no período</div>
        <button className="btn-primary" style={{ marginTop: 8 }} onClick={onEmptyCta}>Registrar uma venda</button>
      </div>
    );
  }
  const points = data.map((d,i)=>{
    const x = (i/(Math.max(1, data.length-1))) * 100;
    const y = 100 - (d.y/maxY)*100;
    return `${x},${y}`;
  }).join(' ');
  const handleMove = (e)=>{
    const svg = svgRef.current; if (!svg) return;
    const r = svg.getBoundingClientRect();
    const rel = (e.clientX - r.left) / r.width;
    const idx = Math.max(0, Math.min(data.length-1, Math.round(rel*(data.length-1))));
    setHover({ i: idx, d: data[idx] });
  };
  const handleLeave = ()=> setHover(null);
  return (
    <div className="card" style={{ padding:'1rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <strong>{mode === 'revenue' ? 'Receita diária' : 'Itens vendidos por dia'}</strong>
        {hover && <span className="helper-text">{hover.d.x} • {mode==='revenue' ? formatCurrency(hover.d.y) : `${hover.d.y} itens`}</span>}
      </div>
      <div style={{ width:'100%', height:360, position:'relative' }}>
        <svg ref={svgRef} onMouseMove={handleMove} onMouseLeave={handleLeave} viewBox="0 0 100 110" preserveAspectRatio="none" style={{ width:'100%', height:'100%', background:'linear-gradient(180deg, rgba(79,70,229,0.06), transparent)' }}>
          <defs>
            <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Grid Y */}
          {yTicks.map((val,i)=>(
            <line key={i} x1="0" x2="100" y1={100 - (val/maxY)*100} y2={100 - (val/maxY)*100} stroke="rgba(0,0,0,0.06)" />
          ))}
          <polyline fill="none" stroke="#4f46e5" strokeWidth="1.6" points={points} />
          <polygon fill="url(#area)" points={`0,100 ${points} 100,100`} />
          {hover ? (
            <>
              <circle cx={(hover.i/(Math.max(1, data.length-1)))*100} cy={100 - (hover.d.y/maxY)*100} r="2" fill="#1d4ed8" />
              <line x1={(hover.i/(Math.max(1, data.length-1)))*100} x2={(hover.i/(Math.max(1, data.length-1)))*100} y1="0" y2="100" stroke="rgba(0,0,0,0.1)" />
            </>
          ) : null}
          {/* Axis labels */}
          {yTicks.map((val,i)=>(
            <text key={`yt-${i}`} x="0" y={100 - (val/maxY)*100} dy="-0.5" fontSize="2.6" fill="#64748b">{mode==='revenue' ? formatCurrency(val).replace('R$','') : val}</text>
          ))}
          {data.map((d,i)=>(
            <text key={`xt-${i}`} x={(i/(Math.max(1,data.length-1)))*100} y="108" fontSize="2.6" fill="#64748b" textAnchor="middle">{String(d.x).slice(5)}</text>
          ))}
        </svg>
      </div>
    </div>
  );
}
