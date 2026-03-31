import React from 'react';

export default function ApiHowTo() {
  return (
    <div className="card api-card">
      <div className="section-head">
        <div className="section-title">Como usar</div>
        <div className="section-meta">Boas práticas de segurança</div>
      </div>
      <div className="section-body">
        <div className="api-steps">
          <div className="api-step">
            <div className="api-step-icon"><i className="fas fa-key"></i></div>
            <div className="api-step-text">
              <div className="api-step-title">Gere uma chave</div>
              <div className="api-step-desc">Crie uma chave com um nome que identifique a integração</div>
            </div>
          </div>
          <div className="api-step">
            <div className="api-step-icon"><i className="fas fa-shield-halved"></i></div>
            <div className="api-step-text">
              <div className="api-step-title">Copie e armazene com segurança</div>
              <div className="api-step-desc">A chave será exibida apenas uma vez</div>
            </div>
          </div>
          <div className="api-step">
            <div className="api-step-icon"><i className="fas fa-code"></i></div>
            <div className="api-step-text">
              <div className="api-step-title">Use no header Authorization</div>
              <div className="api-step-desc">Envie como Bearer Token nas requisições ao endpoint</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
