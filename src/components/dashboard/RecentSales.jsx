import React from 'react';

export default function RecentSales({ sales, formatCurrency }) {
  if (!sales || sales.length === 0) {
    return (
      <div className="card" style={{ padding:'1rem' }}>
        <div className="section-head">
          <div className="section-title">Últimas vendas</div>
          <div className="section-meta">Tempo real</div>
        </div>
        <p className="helper-text">Nenhuma venda registrada recentemente.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding:'1rem' }}>
      <div className="section-head">
        <div className="section-title">Últimas vendas</div>
        <div className="section-meta">Tempo real</div>
      </div>
      <div className="table-responsive section-body">
        <table className="products-table" role="table" aria-label="Últimas vendas">
          <thead>
            <tr>
              <th>Data</th>
              <th>Produto</th>
              <th>Qtd</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sales.map(sale => (
              <tr key={sale.id}>
                <td>
                  {new Date(sale.date).toLocaleDateString()}
                  {' '}
                  <small style={{color:'#666'}}>{new Date(sale.date).toLocaleTimeString().slice(0,5)}</small>
                </td>
                <td>{sale.product}</td>
                <td>{sale.qty}</td>
                <td style={{ fontWeight:600 }}>{formatCurrency(sale.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
