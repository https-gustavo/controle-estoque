import React, { useMemo, useState } from 'react';
import ApiResponseViewer from './ApiResponseViewer';

const resources = [
  { value: 'products', label: '/produtos', method: 'GET' },
  { value: 'sales', label: '/vendas', method: 'POST' },
  { value: 'summary', label: '/vendas/resumo', method: 'POST' },
  { value: 'daily', label: '/vendas/diario', method: 'POST' },
  { value: 'top', label: '/produtos/top', method: 'POST' },
  { value: 'low', label: '/produtos/estoque-baixo', method: 'GET' }
];

export default function ApiPlayground({ supabase, apiKey, setApiKey, showToast }) {
  const [resource, setResource] = useState('products');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [threshold, setThreshold] = useState(5);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState(null);

  const meta = useMemo(() => resources.find(r => r.value === resource) || resources[0], [resource]);

  const copy = (text, okMsg) => {
    navigator.clipboard.writeText(text).then(()=>showToast?.(okMsg || 'Copiado')).catch(()=>showToast?.('Falha ao copiar', 'danger'));
  };

  const buildCurl = () => {
    const base = 'http://localhost:5773';
    if (resource === 'products') return `curl -H "Authorization: Bearer ${apiKey || '<SUA_CHAVE>'}" "${base}/api/produtos?page=1&limit=20"`;
    if (resource === 'low') return `curl -H "Authorization: Bearer ${apiKey || '<SUA_CHAVE>'}" "${base}/api/low-stock?threshold=${threshold}"`;
    const rpc = resource === 'sales' ? 'api_sales'
      : resource === 'summary' ? 'api_sales_summary'
      : resource === 'daily' ? 'api_sales_daily'
      : 'api_product_performance';
    return [
      `curl -X POST "${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/${rpc}"`,
      ` -H "apikey: ${import.meta.env.VITE_SUPABASE_ANON_KEY}"`,
      ` -H "Authorization: Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}"`,
      ` -H "Content-Type: application/json"`,
      ` -d '{ "p_api_key":"${apiKey || '<SUA_CHAVE>'}","p_from":"${from}","p_to":"${to}" }'`
    ].join('');
  };

  const exec = async () => {
    if (!apiKey) { showToast?.('Informe uma chave de API', 'danger'); return; }
    setLoading(true);
    setStatus(null);
    try {
      let r;
      if (resource === 'products') {
        r = await supabase.rpc('api_products', { p_api_key: apiKey });
      } else if (resource === 'sales') {
        r = await supabase.rpc('api_sales', { p_api_key: apiKey, p_from: from, p_to: to });
      } else if (resource === 'summary') {
        r = await supabase.rpc('api_sales_summary', { p_api_key: apiKey, p_from: from, p_to: to });
      } else if (resource === 'daily') {
        r = await supabase.rpc('api_sales_daily', { p_api_key: apiKey, p_from: from, p_to: to });
      } else if (resource === 'top') {
        r = await supabase.rpc('api_product_performance', { p_api_key: apiKey, p_from: from, p_to: to });
      } else if (resource === 'low') {
        r = await supabase.rpc('api_low_stock', { p_api_key: apiKey, threshold });
      }
      if (r?.error) {
        setStatus({ tone:'danger', label:`Erro` });
        setResponse(JSON.stringify({ error: r.error.message }, null, 2));
        showToast?.('Erro ao executar requisição', 'danger');
      } else {
        setStatus({ tone:'success', label:'200 OK' });
        setResponse(JSON.stringify(r?.data ?? null, null, 2));
      }
    } catch (e) {
      setStatus({ tone:'danger', label:'Erro' });
      setResponse(JSON.stringify({ error: e?.message || 'Falha ao executar' }, null, 2));
      showToast?.('Erro ao executar requisição', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const persistKey = () => {
    try { localStorage.setItem('apiPreviewKey', apiKey || ''); showToast?.('Chave salva'); } catch {}
  };
  const clearKey = () => {
    try { localStorage.removeItem('apiPreviewKey'); } catch {}
    setApiKey('');
  };

  const needsRange = resource === 'sales' || resource === 'summary' || resource === 'daily' || resource === 'top';

  return (
    <div className="card api-card api-playground">
      <div className="section-head">
        <div className="section-title">Playground</div>
        <div className="section-meta">Teste endpoints estilo Postman (simplificado)</div>
      </div>
      <div className="section-body">
        <div className="api-playground-grid">
          <div className="form-group">
            <label>Chave de API</label>
            <div className="api-key-input">
              <input className="form-input" type="password" value={apiKey} onChange={(e)=>setApiKey(e.target.value)} placeholder="Cole sua chave aqui" />
              <button className="btn-outline" onClick={persistKey}>Salvar</button>
              <button className="btn-outline" onClick={clearKey}>Limpar</button>
            </div>
          </div>

          <div className="api-request-row">
            <div className="api-method">{meta.method}</div>
            <div className="form-group grow">
              <label>Endpoint</label>
              <select className="form-input" value={resource} onChange={(e)=>setResource(e.target.value)}>
                {resources.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="api-request-actions">
              <button className="btn-primary" disabled={loading} onClick={exec}>{loading ? 'Executando...' : 'Executar requisição'}</button>
              <button className="btn-outline" onClick={()=>copy(buildCurl(), 'cURL copiado')}>Copiar cURL</button>
              <button className="btn-outline" onClick={()=>copy(response || '', 'Resposta copiada')} disabled={!response}>Copiar resposta</button>
            </div>
          </div>

          {needsRange && (
            <div className="api-params">
              <div className="form-group">
                <label>De</label>
                <input type="date" className="form-input" value={from} onChange={(e)=>setFrom(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Até</label>
                <input type="date" className="form-input" value={to} onChange={(e)=>setTo(e.target.value)} />
              </div>
            </div>
          )}
          {resource === 'low' && (
            <div className="api-params">
              <div className="form-group">
                <label>Limite</label>
                <input type="number" className="form-input" min="0" value={threshold} onChange={(e)=>setThreshold(Number(e.target.value||0))} />
              </div>
            </div>
          )}

          <ApiResponseViewer value={response || 'Clique em “Executar requisição” para ver a resposta.'} statusLabel={status?.label} statusTone={status?.tone} />
        </div>
      </div>
    </div>
  );
}

