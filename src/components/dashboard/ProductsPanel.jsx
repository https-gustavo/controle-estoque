import React from 'react';

export default function ProductsPanel({
  search,
  setSearch,
  filters,
  setFilters,
  form,
  handleChange,
  handleCreate,
  loading,
  filteredProducts,
  handleDelete,
  onOpenEntryModal
}) {
  return (
    <>
      <div className="page-header">
        <h2><i className="fas fa-boxes"></i> Produtos</h2>
        <p className="page-subtitle">Gerencie seu catálogo, estoque e entradas.</p>
      </div>
      <div className="page-box">
      <div className="products-filters">
        <div className="form-row">
          <div className="form-group">
            <label>Buscar</label>
            <input className="form-input" type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome ou código" />
          </div>
          <div className="form-group">
            <label>Preço mín</label>
            <input className="form-input" type="number" step="0.01" value={filters.minPrice} onChange={(e)=>setFilters(prev=>({...prev, minPrice:e.target.value}))}/>
          </div>
          <div className="form-group">
            <label>Preço máx</label>
            <input className="form-input" type="number" step="0.01" value={filters.maxPrice} onChange={(e)=>setFilters(prev=>({...prev, maxPrice:e.target.value}))}/>
          </div>
          <div className="form-group">
            <label>Estoque mín</label>
            <input className="form-input" type="number" value={filters.minStock} onChange={(e)=>setFilters(prev=>({...prev, minStock:e.target.value}))}/>
          </div>
          <div className="form-group">
            <label>Estoque máx</label>
            <input className="form-input" type="number" value={filters.maxStock} onChange={(e)=>setFilters(prev=>({...prev, maxStock:e.target.value}))}/>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select className="form-input" value={filters.stockStatus} onChange={(e)=>setFilters(prev=>({...prev, stockStatus:e.target.value}))}>
              <option value="">Todos</option>
              <option value="low">Baixo</option>
              <option value="normal">Normal</option>
              <option value="high">Alto</option>
            </select>
          </div>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group"><label>Nome</label><input className="form-input" value={form.name} onChange={(e)=>handleChange('name', e.target.value)} /></div>
        <div className="form-group"><label>Código</label><input className="form-input" value={form.barcode} onChange={(e)=>handleChange('barcode', e.target.value)} /></div>
        <div className="form-group"><label>Qtd</label><input className="form-input" type="number" min="0" value={form.quantity} onChange={(e)=>handleChange('quantity', e.target.value)} /></div>
        <div className="form-group"><label>Custo</label><input className="form-input" type="number" step="0.01" min="0" value={form.cost_price} onChange={(e)=>handleChange('cost_price', e.target.value)} /></div>
        <div className="form-group"><label>Venda</label><input className="form-input" type="number" step="0.01" min="0" value={form.sale_price} onChange={(e)=>handleChange('sale_price', e.target.value)} /></div>
        <button className="btn-primary" onClick={handleCreate} disabled={loading}>Adicionar</button>
        <button className="btn-outline" onClick={onOpenEntryModal}>Entrada em lote</button>
      </div>

      <div className="table-responsive" style={{ marginTop: '1rem' }}>
        <table className="products-table" role="table" aria-label="Tabela de produtos">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome</th>
              <th>Qtd</th>
              <th>Custo</th>
              <th>Venda</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => (
              <tr key={p.id}>
                <td>{p.barcode || '—'}</td>
                <td>{p.name}</td>
                <td><span className={`quantity-badge ${p.quantity<10?'low-stock':''}`}>{p.quantity}</span></td>
                <td>{Number(p.cost_price || 0).toFixed(2)}</td>
                <td>{Number(p.sale_price || 0).toFixed(2)}</td>
                <td className="actions-cell">
                  <button className="btn-danger" title="Excluir" onClick={()=>handleDelete(p.id)} disabled={loading}><i className="fas fa-trash"></i></button>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign:'center', color:'var(--text-secondary)' }}>Sem produtos</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
}
