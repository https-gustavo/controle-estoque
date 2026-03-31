import React from 'react';

export default function QuickActions({ onAddProduct, onGoSales, onEntry, onApi }) {
  const items = [
    { icon:'fa-plus', title:'Adicionar produto', on:onAddProduct },
    { icon:'fa-cash-register', title:'Registrar venda', on:onGoSales },
    { icon:'fa-arrow-down', title:'Entrada de estoque', on:onEntry },
    { icon:'fa-key', title:'API', on:onApi },
  ];
  return (
    <div className="card" style={{ padding:'1rem' }}>
      <strong style={{ display:'block', marginBottom:8 }}>Ações rápidas</strong>
      <div style={{ display:'grid', gap:12, gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {items.map((i,idx)=>(
          <button key={idx} className="btn-outline" onClick={i.on} style={{ display:'flex', gap:12, alignItems:'center', padding:'12px 14px', justifyContent:'flex-start' }}>
            <span className="icon"><i className={`fas ${i.icon}`}></i></span>
            <span style={{ textAlign:'left', fontWeight:700 }}>{i.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
