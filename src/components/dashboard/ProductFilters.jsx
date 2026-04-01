import React, { useEffect, useMemo, useState } from 'react';
import ProductAutocomplete from './ProductAutocomplete';

export default function ProductFilters({ search, setSearch, filters, setFilters, onApply, products, sortKey, setSortKey }) {
  const [local, setLocal] = useState({
    search: search || '',
    minPrice: filters.minPrice || '',
    maxPrice: filters.maxPrice || '',
    minStock: filters.minStock || '',
    maxStock: filters.maxStock || '',
    stockStatus: filters.stockStatus || ''
  });
  const [isFiltersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSearch(local.search), 300);
    return () => clearTimeout(t);
  }, [local.search, setSearch]);

  const update = (key, val) => setLocal(prev => ({ ...prev, [key]: val }));
  const apply = () => {
    setSearch(local.search);
    setFilters(prev => ({
      ...prev,
      minPrice: local.minPrice,
      maxPrice: local.maxPrice,
      minStock: local.minStock,
      maxStock: local.maxStock,
      stockStatus: local.stockStatus
    }));
    onApply?.();
  };
  const applySearch = () => {
    setSearch(local.search);
    onApply?.();
  };
  const reset = () => {
    const cleared = { search: '', minPrice: '', maxPrice: '', minStock: '', maxStock: '', stockStatus: '' };
    setLocal(cleared);
    setSearch('');
    setFilters(cleared);
    onApply?.();
  };
  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (local.minPrice) c++;
    if (local.maxPrice) c++;
    if (local.minStock) c++;
    if (local.maxStock) c++;
    if (local.stockStatus) c++;
    return c;
  }, [local]);

  return (
    <div className="card">
      <div className="filters-header">
        <ProductAutocomplete
          products={products}
          value={local.search}
          onChange={(v)=>update('search', v)}
          onPick={(p, raw)=>update('search', p ? (p.name || '') : (raw || ''))}
          placeholder="Buscar por nome, código ou código de barras"
        />
        <div className="toolbar-group">
          {setSortKey && (
            <select className="form-input" style={{ width: 220 }} value={sortKey || 'none'} onChange={(e)=>setSortKey(e.target.value)}>
              <option value="none">Ordenar: padrão</option>
              <option value="name_asc">Nome (A–Z)</option>
              <option value="name_desc">Nome (Z–A)</option>
              <option value="stock_desc">Estoque (maior)</option>
              <option value="stock_asc">Estoque (menor)</option>
              <option value="price_desc">Preço (maior)</option>
              <option value="price_asc">Preço (menor)</option>
            </select>
          )}
          {activeFiltersCount > 0 && (
            <span className="badge info" title={`${activeFiltersCount} filtros ativos`}>{activeFiltersCount} filtros</span>
          )}
          <button className="btn-outline" onClick={applySearch}><i className="fas fa-magnifying-glass"></i> Buscar</button>
          <button className={`btn-outline ${isFiltersOpen || activeFiltersCount>0 ? 'active' : ''}`} onClick={()=>setFiltersOpen(v=>!v)}>
            <i className="fas fa-filter"></i> {isFiltersOpen ? 'Ocultar filtros' : 'Filtros avançados'}
          </button>
        </div>
      </div>

      <div className={`collapse ${isFiltersOpen ? 'open' : ''}`}>
        <div className="collapse-inner">
          <div className="section-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Preço mín</label>
                <input className="form-input" type="number" step="0.01" value={local.minPrice} onChange={(e)=>update('minPrice', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Preço máx</label>
                <input className="form-input" type="number" step="0.01" value={local.maxPrice} onChange={(e)=>update('maxPrice', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Estoque mín</label>
                <input className="form-input" type="number" value={local.minStock} onChange={(e)=>update('minStock', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Estoque máx</label>
                <input className="form-input" type="number" value={local.maxStock} onChange={(e)=>update('maxStock', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select className="form-input" value={local.stockStatus} onChange={(e)=>update('stockStatus', e.target.value)}>
                  <option value="">Todos</option>
                  <option value="normal">Em estoque</option>
                  <option value="low">Estoque baixo</option>
                  <option value="none">Sem estoque</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-outline" onClick={reset}>Limpar filtros</button>
              <button className="btn-primary" onClick={apply}>Aplicar filtros</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
