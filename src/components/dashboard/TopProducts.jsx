import React, { useMemo, useState } from 'react';

export default function TopProducts({ rows, formatCurrency, onViewProduct }) {
  const [sortBy, setSortBy] = useState('revenue'); // 'qty' | 'revenue'
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);
  const sorted = useMemo(()=>{
    const copy = [...(rows||[])];
    copy.sort((a,b)=> sortBy==='revenue' ? b.revenue - a.revenue : b.qty - a.qty);
    return copy;
  },[rows, sortBy]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const cur = sorted.slice((page-1)*pageSize, (page-1)*pageSize + pageSize);
  return (
    <div className="card" style={{ padding:'1rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <strong>Top produtos</strong>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <select className="form-input" value={sortBy} onChange={(e)=>{ setSortBy(e.target.value); setPage(1); }} style={{ width:160 }}>
            <option value="revenue">Ordenar por receita</option>
            <option value="qty">Ordenar por quantidade</option>
          </select>
          <select className="form-input" value={pageSize} onChange={(e)=>{ setPageSize(parseInt(e.target.value)); setPage(1); }} style={{ width:90 }}>
            <option value={5}>5</option>
            <option value={10}>10</option>
          </select>
        </div>
      </div>
      {cur.length === 0 ? (
        <p className="helper-text">Sem dados</p>
      ) : (
        <div className="table-responsive">
          <table className="products-table">
            <thead>
              <tr><th>Produto</th><th>Código</th><th>Qtd</th><th>Receita</th><th>Margem</th><th></th></tr>
            </thead>
            <tbody>
              {cur.map(p=>(
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.barcode || '—'}</td>
                  <td>{p.qty}</td>
                  <td>{formatCurrency(p.revenue)}</td>
                  <td>{p.margin!=null ? `${p.margin.toFixed(1)}%` : '—'}</td>
                  <td><button className="btn-outline small" onClick={()=>onViewProduct?.(p)}>Ver no estoque</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="history-pagination" style={{ marginTop:8 }}>
        <button className="btn-outline" onClick={()=>setPage(p => Math.max(1, p-1))} disabled={page===1}>←</button>
        <span className="page-indicator">Página {page} de {totalPages}</span>
        <button className="btn-outline" onClick={()=>setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}>→</button>
      </div>
    </div>
  );
}
