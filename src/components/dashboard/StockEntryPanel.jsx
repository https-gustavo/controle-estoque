import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import StockEntryForm from './StockEntryForm';
import ProductCreateModal from './ProductCreateModal';

export default function StockEntryPanel({ userId, demo, products, onRefreshProducts, showToast }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [createInitial, setCreateInitial] = useState(null);
  const categories = React.useMemo(() => {
    const set = new Set();
    (Array.isArray(products) ? products : []).forEach(p => {
      const c = String(p?.category || '').trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);
  const handleCreate = (payload) => {
    const evt = new CustomEvent('products:add', { detail: payload });
    window.dispatchEvent(evt);
    onRefreshProducts?.();
  };
  const handleCreateBatch = (list) => {
    const arr = Array.isArray(list) ? list : [];
    if (!arr.length) return;
    window.dispatchEvent(new CustomEvent('products:addMany', { detail: { items: arr } }));
    setCreateOpen(false);
    setCreateInitial(null);
    onRefreshProducts?.();
  };

  useEffect(() => {
    const onNew = (evt) => {
      const code = String(evt?.detail?.code || '').trim();
      if (!code) return;
      setCreateInitial({ barcode: code });
      setCreateOpen(true);
    };
    window.addEventListener('stockentry:new', onNew);
    return () => window.removeEventListener('stockentry:new', onNew);
  }, []);
  return (
    <div className="entrada-page">
      <div className="page-header">
        <div>
          <h2>Entrada de Estoque</h2>
          <p className="page-subtitle">Registre entradas com busca dinâmica e atualize o estoque</p>
        </div>
        <div className="page-actions">
          <button className="btn-primary" onClick={()=>setCreateOpen(true)}>Novo produto</button>
        </div>
      </div>
      <div className="page-box">
        <div className="stack">
          <StockEntryForm
            supabase={supabase}
            userId={userId}
            demo={demo || userId === 'demo'}
            products={products}
            onAfterChange={onRefreshProducts}
            showToast={showToast}
          />
        </div>
      </div>
      <ProductCreateModal
        open={createOpen}
        onClose={()=>{ setCreateOpen(false); setCreateInitial(null); }}
        busy={false}
        initial={createInitial}
        categories={categories}
        onCreate={handleCreate}
        onCreateBatch={handleCreateBatch}
      />
    </div>
  );
}
