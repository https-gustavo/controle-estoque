import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../supabaseClient';
import ApiHeader from './api/ApiHeader';
import ApiHowTo from './api/ApiHowTo';
import ApiKeyGenerator from './api/ApiKeyGenerator';
import ApiKeyTable from './api/ApiKeyTable';
import ApiPlayground from './api/ApiPlayground';

export default function ApiPanel() {
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyPlain, setNewKeyPlain] = useState('');
  const [apiSavedKey, setApiSavedKey] = useState(() => {
    try { return localStorage.getItem('apiPreviewKey') || ''; } catch { return ''; }
  });
  const [copyOk, setCopyOk] = useState(false);
  const [revokeLoadingId, setRevokeLoadingId] = useState(null);
  const [genLoading, setGenLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const newPlainByIdRef = useRef(new Map());

  const showToast = (message, type = 'success', ms = 2500) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), ms);
  };

  const generateKey = async (name) => {
    if (!name?.trim()) { showToast('Informe um nome para a chave', 'danger'); return; }
    setGenLoading(true);
    try {
      const { data, error } = await supabase.rpc('api_create_key', { p_name: name, p_ttl_days: 365 });
      if (error) throw error;
      if (data && data.length > 0) {
        const row = data[0];
        setNewKeyPlain(row.api_key);
        if (row?.id) newPlainByIdRef.current.set(row.id, row.api_key);
        await refreshKeys();
        showToast('Chave gerada com sucesso');
      } else {
        showToast('Não foi possível gerar a chave', 'danger');
      }
    } catch (e) {
      showToast('Não foi possível gerar a chave. Verifique as funções SQL.', 'danger');
    } finally {
      setGenLoading(false);
    }
  };

  const refreshKeys = async () => {
    try {
      const { data } = await supabase.rpc('api_list_keys');
      setApiKeys(data || []);
    } catch {
      setApiKeys([]);
      showToast('Não foi possível listar chaves. Confirme as funções SQL.', 'danger');
    }
  };

  const revokeKey = async (id) => {
    setRevokeLoadingId(id);
    try {
      await supabase.rpc('api_revoke_key', { p_id: id });
      await refreshKeys();
      showToast('Chave revogada');
    } finally {
      setRevokeLoadingId(null);
    }
  };

  const deleteKey = async (k) => {
    const ok = window.confirm('Excluir esta chave? Essa ação não pode ser desfeita.');
    if (!ok) return;
    try {
      const { error } = await supabase.from('api_keys').delete().eq('id', k.id);
      if (error) throw error;
      await refreshKeys();
      showToast('Chave excluída');
    } catch {
      showToast('Não foi possível excluir a chave', 'danger');
    }
  };

  const copyGenerated = () => {
    if (!newKeyPlain) return;
    navigator.clipboard.writeText(newKeyPlain)
      .then(() => { setCopyOk(true); setTimeout(()=>setCopyOk(false), 1500); showToast('Chave copiada'); })
      .catch(() => showToast('Falha ao copiar', 'danger'));
  };

  const copyKey = (k) => {
    const plain = newPlainByIdRef.current.get(k.id);
    if (!plain) { showToast('A chave completa é exibida apenas uma vez', 'danger'); return; }
    navigator.clipboard.writeText(plain).then(()=>showToast('Chave copiada')).catch(()=>showToast('Falha ao copiar', 'danger'));
  };

  useEffect(() => { refreshKeys(); }, []);

  return (
    <>
      <ApiHeader />
      <div className="page-box">
        <div className="api-layout">
          <div className="api-left">
            <ApiHowTo />
            <ApiKeyGenerator onGenerate={generateKey} generatedKey={newKeyPlain} onCopyGenerated={copyGenerated} copyOk={copyOk} loading={genLoading} />
            {toast && <div className={`toast ${toast.type}`} role="status" aria-live="polite" aria-atomic="true">{toast.message}</div>}
          </div>
          <div className="api-right">
            <ApiKeyTable
              keys={apiKeys}
              onRefresh={refreshKeys}
              onRevoke={(k)=>revokeKey(k.id)}
              onDelete={deleteKey}
              onCopyKey={copyKey}
              revokeLoadingId={revokeLoadingId}
            />
            <ApiPlayground supabase={supabase} apiKey={apiSavedKey} setApiKey={setApiSavedKey} showToast={showToast} />
          </div>
        </div>
      </div>
    </>
  );
}
