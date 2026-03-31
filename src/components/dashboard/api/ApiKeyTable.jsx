import React, { useMemo, useState } from 'react';

function isExpired(expiresAt) {
  if (!expiresAt) return false;
  return new Date(expiresAt) <= new Date();
}

function maskFallback(id) {
  const s = String(id || '');
  const head = s.slice(0, 8);
  const tail = s.slice(-4);
  return head && tail ? `api_${head}…${tail}` : '—';
}

export default function ApiKeyTable({ keys, onRefresh, onRevoke, onDelete, onCopyKey, revokeLoadingId }) {
  const [q, setQ] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [revealId, setRevealId] = useState(null);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const arr = (keys || []).filter(k => String(k.name || '').toLowerCase().includes(qq));
    return arr.slice(0, pageSize);
  }, [keys, q, pageSize]);

  const status = (k) => {
    if (k.revoked) return { label: 'Revogada', cls: 'badge gray' };
    if (isExpired(k.expires_at)) return { label: 'Expirada', cls: 'badge red' };
    return { label: 'Ativa', cls: 'badge green' };
  };

  const toggleReveal = (id) => {
    setRevealId(prev => prev === id ? null : id);
    if (revealId !== id) setTimeout(() => setRevealId(curr => curr === id ? null : curr), 5000);
  };

  return (
    <div className="card api-card">
      <div className="section-head">
        <div className="section-title">Gerenciar chaves</div>
        <div className="api-table-actions">
          <button className="btn-outline" onClick={onRefresh}><i className="fas fa-rotate"></i> Atualizar</button>
        </div>
      </div>
      <div className="section-body">
        <div className="table-toolbar">
          <div className="form-group grow">
            <label htmlFor="keysSearch">Buscar por nome</label>
            <div className="search-with-icon">
              <i className="fas fa-search input-icon" aria-hidden="true"></i>
              <input id="keysSearch" className="form-input" type="text" placeholder="Filtrar..." value={q} onChange={(e)=>setQ(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="keysPageSize">Exibir</label>
            <select id="keysPageSize" className="form-input" value={pageSize} onChange={(e)=>setPageSize(Number(e.target.value))}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="table-responsive api-keys-wrap">
          <table className="products-table api-keys-table" role="table" aria-label="Chaves de API">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Chave</th>
                <th>Criada em</th>
                <th>Expira em</th>
                <th>Último uso</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(k => {
                const st = status(k);
                const preview = k.key_preview || maskFallback(k.id);
                const show = revealId === k.id;
                return (
                  <tr key={k.id}>
                    <td>{k.name}</td>
                    <td className="api-key-cell">
                      <span className="api-key-mono">{show ? preview : `${preview.slice(0, 8)}…${preview.slice(-4)}`}</span>
                    </td>
                    <td>{k.created_at ? new Date(k.created_at).toLocaleString() : '—'}</td>
                    <td>{k.expires_at ? new Date(k.expires_at).toLocaleDateString() : '—'}</td>
                    <td>{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : '—'}</td>
                    <td><span className={st.cls}>{st.label}</span></td>
                    <td className="actions-cell">
                      <button className="btn-action edit" title="Mostrar por 5s" onClick={()=>toggleReveal(k.id)}><i className="fas fa-eye"></i></button>
                      <button className="btn-action" title="Copiar" onClick={()=>onCopyKey?.(k)}><i className="fas fa-copy"></i></button>
                      {!k.revoked && (
                        <button className="btn-action" title="Revogar" disabled={revokeLoadingId===k.id} onClick={()=>onRevoke?.(k)}><i className="fas fa-ban"></i></button>
                      )}
                      <button className="btn-action delete" title="Excluir" onClick={()=>onDelete?.(k)}><i className="fas fa-trash"></i></button>
                    </td>
                  </tr>
                );
              })}
              {(!keys || keys.length === 0) && (
                <tr>
                  <td colSpan="7" style={{ textAlign:'center', color:'var(--text-secondary)' }}>Nenhuma chave criada ainda</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

