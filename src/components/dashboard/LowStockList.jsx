import React from 'react';

export default function LowStockList({ items, onAdjust }) {
  if (!items || items.length === 0) {
    return (
      <div className="card" style={{ padding:'1rem' }}>
        <strong>Atenção</strong>
        <p className="helper-text">Tudo ok no estoque.</p>
      </div>
    );
  }
  return (
    <div className="card" style={{ padding:'1rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <strong>Estoque baixo</strong>
        <span className="helper-text">Top {Math.min(5, items.length)}</span>
      </div>
      <ul style={{ listStyle:'none', padding:0, margin:0, display:'grid', gap:8 }}>
        {items.slice(0,5).map(p=>(
          <li key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
            <div>
              <div style={{ fontWeight:600 }}>{p.name}</div>
              <div className="helper-text">{p.barcode || ''}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span className="quantity-badge low-stock">{p.quantity}</span>
              <button className="btn-outline small" onClick={()=>onAdjust?.(p)}>Ajustar</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

