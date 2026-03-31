import React, { useState } from 'react';

export default function ApiKeyGenerator({ onGenerate, generatedKey, onCopyGenerated, copyOk, loading }) {
  const [name, setName] = useState('');

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await onGenerate?.(trimmed);
    setName('');
  };

  return (
    <div className="card api-card">
      <div className="section-head">
        <div className="section-title">Gerar nova chave</div>
        <div className="section-meta">Rotacione e gerencie integrações</div>
      </div>
      <div className="section-body">
        <div className="api-gen-row">
          <div className="form-group grow">
            <label htmlFor="newKeyName">Nome da chave (ex: Integração ERP)</label>
            <input
              id="newKeyName"
              className="form-input"
              type="text"
              value={name}
              onChange={(e)=>setName(e.target.value)}
              placeholder="Ex.: Integração ERP"
            />
          </div>
          <button className="btn-primary" onClick={submit} disabled={loading || !name.trim()}>
            {loading ? 'Gerando...' : 'Gerar chave'}
          </button>
        </div>

        {generatedKey && (
          <div className="api-generated">
            <div className="api-generated-head">
              <div className="api-generated-title">Chave gerada</div>
              <div className="badge amber">Exibida apenas uma vez</div>
            </div>
            <div className="api-generated-body">
              <input readOnly className="form-input" value={generatedKey} aria-label="Chave gerada" />
              <button className="btn-outline" onClick={onCopyGenerated}>{copyOk ? 'Copiado!' : 'Copiar'}</button>
            </div>
            <div className="api-generated-hint">Armazene com segurança. Se perder, gere uma nova chave.</div>
          </div>
        )}
      </div>
    </div>
  );
}
