import React, { useMemo, useState } from 'react';
import ProductFilters from './ProductFilters';
import ProductTable from './ProductTable';
import ProductEditModal from './ProductEditModal';

export default function ProductsPanel({
  search,
  setSearch,
  filters,
  setFilters,
  products,
  loading,
  filteredProducts,
  handleDelete,
  onGoEntry,
  onUpdate
}) {
  const rows = useMemo(()=> filteredProducts.map(p => ({ ...p })), [filteredProducts]);
  const [editOpen, setEditOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const handleAdd = (payload, clear) => {
    const evt = new CustomEvent('products:add', { detail: payload });
    window.dispatchEvent(evt);
    clear?.();
  };

  return (
    <div className="produtos-page">
      <div className="page-header">
        <div>
          <h2>Produtos</h2>
          <p className="page-subtitle">Cadastro e gerenciamento de produtos</p>
        </div>
        <div className="page-actions">
          <button className="btn-outline" onClick={onGoEntry}>Entrada de estoque</button>
        </div>
      </div>
      <div className="page-box">
        <div className="stack">
          <ProductFilters search={search} setSearch={setSearch} filters={filters} setFilters={setFilters} onApply={()=>{}} products={products} />

          <ProductTable
            rows={rows}
            formatCurrency={(v)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
            onDelete={handleDelete}
            onEdit={(p)=>{ setEditProduct(p); setEditOpen(true); }}
          />
        </div>
      </div>
      <ProductEditModal
        open={editOpen}
        product={editProduct}
        saving={loading}
        onClose={()=>{ setEditOpen(false); setEditProduct(null); }}
        onSave={(id, patch)=>onUpdate?.(id, patch)}
      />
    </div>
  );
}
