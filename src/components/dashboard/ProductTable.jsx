import React from 'react';

export default function ProductTable({ rows, formatCurrency, onDelete, onEdit }) {
  const statusBadge = (q) => {
    const qty = Number(q||0);
    if (qty <= 0) return { label: 'Sem estoque', cls: 'badge red' };
    if (qty < 10) return { label: 'Baixo', cls: 'badge amber' };
    return { label: 'Em estoque', cls: 'badge green' };
  };
  const marginPct = (cost, sale) => {
    const c = Number(cost||0), s = Number(sale||0);
    if (s <= 0) return '—';
    const m = ((s - c) / s) * 100;
    return `${m.toFixed(1)}%`;
  };
  return (
    <>
      {rows.length === 0 ? (
        <div className="helper-text">Nenhum produto encontrado.</div>
      ) : (
        <table className="products-table" role="table" aria-label="Tabela de produtos">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Qtd</th>
              <th className="num">Custo</th>
              <th className="num">Margem</th>
              <th className="num">Venda</th>
              <th>Status</th>
              <th>Atualizado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(p=> {
              const st = statusBadge(p.quantity);
              return (
                <tr key={p.id}>
                  <td className="code">{p.barcode || '—'}</td>
                  <td className="name">{p.name}</td>
                  <td className="category">{p.category || '—'}</td>
                  <td className="qty"><span className={`quantity-badge ${Number(p.quantity||0)<=0?'low-stock':''}`}>{p.quantity||0}</span></td>
                  <td className="num">{formatCurrency ? formatCurrency(p.cost_price||0) : Number(p.cost_price||0).toFixed(2)}</td>
                  <td className="num">{marginPct(p.cost_price, p.sale_price)}</td>
                  <td className="num">{formatCurrency ? formatCurrency(p.sale_price||0) : Number(p.sale_price||0).toFixed(2)}</td>
                  <td className="status"><span className={st.cls}>{st.label}</span></td>
                  <td className="date">{(p.updated_at || p.created_at) ? new Date(p.updated_at || p.created_at).toLocaleDateString() : '—'}</td>
                  <td className="actions-cell">
                    <button className="btn-action edit" title="Editar" aria-label="Editar produto" onClick={()=>onEdit?.(p)}><i className="fas fa-pen"></i></button>
                    <button className="btn-action delete" title="Excluir" aria-label="Excluir produto" onClick={()=>onDelete?.(p.id)}><i className="fas fa-trash"></i></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
