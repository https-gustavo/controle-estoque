import React from 'react';

export default function ApiHeader() {
  const env = import.meta.env.MODE === 'production' ? 'Produção' : 'Desenvolvimento';
  return (
    <div className="page-header api-page-header">
      <div className="api-title">
        <h2><i className="fas fa-code"></i> API &amp; Integrações</h2>
        <p className="page-subtitle">Gerencie chaves, teste endpoints e integre seu sistema</p>
      </div>
      <div className="api-env">
        <span className="badge info">Ambiente: {env}</span>
      </div>
    </div>
  );
}
