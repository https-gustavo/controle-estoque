import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import StockEntryForm from './StockEntryForm';
import ProductCreateModal from './ProductCreateModal';

export default function StockEntryPanel({ userId, products, onRefreshProducts, showToast }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [createInitial, setCreateInitial] = useState(null);
  const handleCreate = (payload) => {
    const evt = new CustomEvent('products:add', { detail: payload });
    window.dispatchEvent(evt);
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
            products={products}
            onAfterChange={onRefreshProducts}
            showToast={showToast}
          />
        </div>
      </div>
      <ProductCreateModal
        open={createOpen}
        onClose={()=>setCreateOpen(false)}
        busy={false}
        initial={createInitial}
        onCreate={handleCreate}
      />
    </div>
  );
}
