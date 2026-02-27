import React, { useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';

export default function ApiPanel() {
  const [apiResource, setApiResource] = useState('products');
  const [apiFrom, setApiFrom] = useState('');
  const [apiTo, setApiTo] = useState('');
  const [apiThreshold, setApiThreshold] = useState(5);
  const [apiPreview, setApiPreview] = useState('');
  const [apiLoading, setApiLoading] = useState(false);
  const [apiMsg, setApiMsg] = useState('');
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPlain, setNewKeyPlain] = useState('');
  const [apiSavedKey, setApiSavedKey] = useState(() => {
    try { return localStorage.getItem('apiPreviewKey') || ''; } catch { return ''; }
  });
  const [showSaved, setShowSaved] = useState(false);
  const [copyOk, setCopyOk] = useState(false);
  const [keysSearch, setKeysSearch] = useState('');
  const [keysPageSize, setKeysPageSize] = useState(10);
  const [revokeLoadingId, setRevokeLoadingId] = useState(null);

  const filteredKeys = useMemo(() => {
    const q = keysSearch.toLowerCase();
    return (apiKeys || []).filter(k => (k.name || '').toLowerCase().includes(q)).slice(0, keysPageSize);
  }, [apiKeys, keysSearch, keysPageSize]);

  const generateKey = async () => {
    if (!newKeyName.trim()) { setApiMsg('Informe um nome para a chave.'); return; }
    setApiMsg('');
    try {
      const { data, error } = await supabase.rpc('api_create_key', { p_name: newKeyName, p_ttl_days: 365 });
      if (error) throw error;
      if (data && data.length > 0) {
        setNewKeyPlain(data[0].api_key);
        setNewKeyName('');
        const res = await supabase.rpc('api_list_keys');
        setApiKeys(res?.data || []);
      } else {
        setApiMsg('Não foi possível gerar a chave.');
      }
    } catch (e) {
      setApiMsg('Não foi possível gerar a chave. Verifique as funções SQL.');
    }
  };

  const refreshKeys = async () => {
    try {
      const { data } = await supabase.rpc('api_list_keys');
      setApiKeys(data || []);
    } catch {
      setApiKeys([]);
      setApiMsg('Não foi possível listar chaves. Confirme as funções SQL.');
    }
  };

  const revokeKey = async (id) => {
    setRevokeLoadingId(id);
    try {
      await supabase.rpc('api_revoke_key', { p_id: id });
      const { data: list } = await supabase.rpc('api_list_keys');
      setApiKeys(list || []);
    } finally {
      setRevokeLoadingId(null);
    }
  };

  const copyCurl = () => {
    const base = 'http://localhost:5773';
    let cmd = '';
    if (apiResource === 'products') {
      cmd = `curl -H "Authorization: Bearer ${apiSavedKey || '<SUA_CHAVE>'}" "${base}/api/produtos?page=1&limit=20"`;
    } else if (apiResource === 'low') {
      cmd = `curl -H "Authorization: Bearer ${apiSavedKey || '<SUA_CHAVE>'}" "${base}/api/low-stock?threshold=${apiThreshold}"`;
    } else {
      const rpc = apiResource === 'sales' ? 'api_sales'
                : apiResource === 'summary' ? 'api_sales_summary'
                : apiResource === 'daily' ? 'api_sales_daily'
                : 'api_product_performance';
      cmd = [
        `curl -X POST "${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/${rpc}"`,
        ` -H "apikey: ${import.meta.env.VITE_SUPABASE_ANON_KEY}"`,
        ` -H "Authorization: Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}"`,
        ` -H "Content-Type: application/json"`,
        ` -d '{ "p_api_key":"${apiSavedKey || '<SUA_CHAVE>'}","p_from":"${apiFrom}","p_to":"${apiTo}" }'`
      ].join('');
    }
    navigator.clipboard.writeText(cmd).then(()=>setApiMsg('cURL copiado')).catch(()=>setApiMsg('Falha ao copiar cURL'));
  };

  const previewJson = async () => {
    setApiLoading(true);
    try{
      let data = null;
      let key = apiSavedKey || newKeyPlain;
      if(!key){
        const s = prompt('Informe uma chave de API válida:');
        if (!s) { setApiMsg('Chave não informada.'); setApiLoading(false); return; }
        key = s;
      }
      if(apiResource==='products'){
        const r = await supabase.rpc('api_products', { p_api_key: key });
        data = r.data||[];
      } else if(apiResource==='sales'){
        const r = await supabase.rpc('api_sales', { p_api_key: key, p_from: apiFrom, p_to: apiTo });
        data = r.data||[];
      } else if(apiResource==='summary'){
        const r = await supabase.rpc('api_sales_summary',{ p_api_key: key, p_from: apiFrom, p_to: apiTo });
        data = r.data||[];
      } else if(apiResource==='daily'){
        const r = await supabase.rpc('api_sales_daily',{ p_api_key: key, p_from: apiFrom, p_to: apiTo });
        data = r.data||[];
      } else if(apiResource==='top'){
        const r = await supabase.rpc('api_product_performance',{ p_api_key: key, p_from: apiFrom, p_to: apiTo });
        data = r.data||[];
      } else if(apiResource==='low'){
        const r = await supabase.rpc('api_low_stock',{ p_api_key: key, threshold: apiThreshold });
        data = r.data||[];
      }
      setApiPreview(JSON.stringify(data, null, 2));
    } finally{
      setApiLoading(false);
    }
  };

  return (
    <div className="page-box">
      <div className="api-container">
      <div className="page-header">
        <h2><i className="fas fa-code"></i> API</h2>
        <p className="page-subtitle">Gere chaves, teste endpoints e visualize respostas.</p>
      </div>
      <div className="api-card">
        <h3><i className="fas fa-circle-info" aria-hidden="true"></i> Como usar</h3>
        <ul style={{ margin:0, paddingLeft:'1.1rem', lineHeight:1.6 }}>
          <li>Digite um nome e gere uma chave.</li>
          <li>Copie a chave exibida (aparece uma única vez) e guarde.</li>
          <li>Salve uma chave para pré-visualizar dados.</li>
        </ul>
        {!!apiMsg && <div style={{ marginTop:8, color:'var(--danger-color)', fontWeight:600 }}>{apiMsg}</div>}
      </div>

      <div className="api-two-col" style={{ display:'grid', gap:12 }}>
        <div className="api-card">
          <h3><i className="fas fa-key" aria-hidden="true"></i> Gerar nova chave</h3>
          <div className="api-row inline">
            <div className="form-group api-input">
              <label htmlFor="newKeyName">Nome da chave</label>
              <input id="newKeyName" className="form-input" type="text" placeholder="Ex.: Integração ERP" value={newKeyName} onChange={(e)=>setNewKeyName(e.target.value)} />
            </div>
            <div className="api-actions" style={{ justifyContent:'end' }}>
              <button className="btn-primary" onClick={generateKey}>Gerar chave</button>
            </div>
          </div>
          {newKeyPlain && (
            <div className="api-row" style={{ marginTop:10 }}>
              <div className="api-hint"><strong>Chave gerada (uma única vez)</strong></div>
              <div className="api-copy-field">
                <input readOnly className="form-input" value={newKeyPlain} aria-label="Chave gerada" />
                <button className="btn-outline" onClick={()=>{
                  navigator.clipboard.writeText(newKeyPlain).then(()=>{ setCopyOk(true); setTimeout(()=>setCopyOk(false),1500); }).catch(()=>{});
                }}>{copyOk ? 'Copiado!' : 'Copiar'}</button>
              </div>
            </div>
          )}
        </div>

        <div className="api-card">
          <h3><i className="fas fa-gears" aria-hidden="true"></i> Gerenciar chaves</h3>
          <div className="api-row inline">
            <div className="form-group api-input">
              <label htmlFor="savedKey">Chave salva (pré-visualização)</label>
              <div className="api-row inline" style={{ gridTemplateColumns:'1fr auto auto auto' }}>
                <input id="savedKey" className="form-input" type={showSaved ? 'text':'password'} placeholder="Cole sua chave aqui" value={apiSavedKey} onChange={(e)=>setApiSavedKey(e.target.value)} />
                <button className="btn-outline" onClick={()=>setShowSaved(v=>!v)}>{showSaved ? 'Ocultar' : 'Mostrar'}</button>
                <button className="btn-outline" disabled={!apiSavedKey || apiSavedKey.length < 20} onClick={()=>{
                  try { localStorage.setItem('apiPreviewKey', apiSavedKey || ''); setApiMsg('Chave salva.'); } catch {}
                }}>Salvar</button>
                <button className="btn-outline" onClick={()=>{
                  try { localStorage.removeItem('apiPreviewKey'); setApiSavedKey(''); setApiMsg('Chave removida.'); } catch {}
                }}>Remover</button>
              </div>
              {apiSavedKey && apiSavedKey.length > 0 && apiSavedKey.length < 20 && <div className="api-error">Chave muito curta.</div>}
            </div>
            <div className="api-actions" style={{ justifyContent:'end' }}>
              <button className="btn-outline" onClick={refreshKeys}>Atualizar lista</button>
            </div>
          </div>

          <div className="table-toolbar">
            <div className="form-group" style={{ flex:1 }}>
              <label htmlFor="keysSearch">Buscar por nome</label>
              <input id="keysSearch" className="form-input" type="text" placeholder="Filtrar..." value={keysSearch} onChange={(e)=>setKeysSearch(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="keysPageSize">Exibir</label>
              <select id="keysPageSize" className="form-input" value={keysPageSize} onChange={(e)=>setKeysPageSize(Number(e.target.value))}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="api-keys-wrap">
            <table className="products-table api-keys-table">
              <thead>
                <tr>
                  <th>Nome</th><th>Criada em</th><th>Expira em</th><th>Usada por último</th><th>Status</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredKeys.map(k=>(
                  <tr key={k.id}>
                    <td>{k.name}</td>
                    <td>{new Date(k.created_at).toLocaleString()}</td>
                    <td>{k.expires_at ? new Date(k.expires_at).toLocaleDateString() : '—'}</td>
                    <td>{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : '—'}</td>
                    <td>
                      {k.revoked
                        ? <span className="badge gray" aria-label="Revogada">Revogada</span>
                        : (k.expires_at && new Date(k.expires_at) <= new Date()
                          ? <span className="badge amber" aria-label="Expirada">Expirada</span>
                          : <span className="badge green" aria-label="Ativa">Ativa</span>
                          )
                      }
                    </td>
                    <td>
                      {!k.revoked && (
                        <button className="btn-outline" aria-label="Revogar chave" disabled={revokeLoadingId === k.id} onClick={()=>revokeKey(k.id)}>
                          {revokeLoadingId === k.id ? 'Revogando…' : 'Revogar'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {apiKeys && apiKeys.length===0 && <tr><td colSpan="6" style={{ textAlign:'center', color:'var(--text-secondary)' }}>Nenhuma chave criada</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="api-card api-json-card">
        <div className="api-json-head">
          <div className="form-group">
            <label htmlFor="apiResourceSelect">Recurso</label>
            <select id="apiResourceSelect" className="form-input" value={apiResource} onChange={(e)=>setApiResource(e.target.value)}>
              <option value="products">Produtos</option>
              <option value="sales">Vendas</option>
              <option value="summary">Resumo</option>
              <option value="daily">Receita diária</option>
              <option value="top">Top produtos</option>
              <option value="low">Estoque baixo</option>
            </select>
          </div>
          {(apiResource === 'sales' || apiResource === 'summary' || apiResource === 'daily' || apiResource === 'top') && (
            <div className="form-group">
              <label>Período</label>
              <div className="api-row inline" style={{ gridTemplateColumns:'auto auto' }}>
                <input type="date" className="form-input" value={apiFrom} onChange={(e)=>setApiFrom(e.target.value)} aria-label="De" />
                <input type="date" className="form-input" value={apiTo} onChange={(e)=>setApiTo(e.target.value)} aria-label="Até" />
              </div>
            </div>
          )}
          {apiResource === 'low' && (
            <div className="form-group">
              <label htmlFor="apiThreshold">Limite</label>
              <input id="apiThreshold" className="form-input" type="number" value={apiThreshold} onChange={(e)=>setApiThreshold(Number(e.target.value||0))} min="0" />
            </div>
          )}
          <div className="api-actions" style={{ justifyContent:'end' }}>
            <button className="btn-primary" disabled={apiLoading} onClick={previewJson}>
              {apiLoading?'Carregando...':'Visualizar JSON'}
            </button>
            <button className="btn-outline" onClick={copyCurl}>Copiar cURL</button>
          </div>
        </div>
        <pre style={{ whiteSpace:'pre-wrap' }}>{apiPreview || 'Clique em "Visualizar JSON" para ver a resposta.'}</pre>
      </div>
      </div>
    </div>
  );
}

