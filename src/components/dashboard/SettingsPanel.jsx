import React from 'react';

export default function SettingsPanel({
  companySettings,
  setCompanySettings,
  onLogoFileChange,
  onSaveCompanySettings,
}) {
  return (
    <div className="configuracoes-page">
      <div className="page-header">
        <h2><i className="fas fa-cog"></i> Configurações do Sistema</h2>
        <p className="page-subtitle">Defina informações da conta e da empresa.</p>
      </div>
      <div className="page-box">
      <div className="settings-section">
        <div className="settings-card card">
          <h3><i className="fas fa-user"></i> Perfil do Usuário</h3>
          <div className="setting-item">
            <label>Nome de Usuário</label>
            <input type="text" className="form-input" placeholder="Seu nome" />
          </div>
          <div className="setting-item">
            <label>Email</label>
            <input type="email" className="form-input" placeholder="seu@email.com" />
          </div>
          <button className="btn-primary">
            <i className="fas fa-save"></i>
            Salvar Alterações
          </button>
        </div>

        <div className="settings-card card">
          <h3><i className="fas fa-store"></i> Configurações da Empresa</h3>
          <div className="setting-item">
            <label>Nome da Empresa</label>
            <input 
              type="text" 
              className="form-input" 
              value={companySettings.name}
              onChange={(e) => setCompanySettings({...companySettings, name: e.target.value})}
              placeholder="Nome da sua empresa" 
            />
          </div>
          <div className="setting-item">
            <label>Logo da Empresa (URL)</label>
            <input 
              type="url" 
              className="form-input" 
              value={companySettings.logo}
              onChange={(e) => setCompanySettings({...companySettings, logo: e.target.value})}
              placeholder="https://exemplo.com/logo.png" 
            />
            <div className="setting-item" style={{ marginTop: '0.5rem' }}>
              <label>Logo da Empresa (arquivo do computador)</label>
              <input type="file" accept="image/*" onChange={onLogoFileChange} />
            </div>
            {companySettings.logo && (
              <div className="logo-preview">
                <img src={companySettings.logo} alt="Preview do Logo" className="logo-preview-img" />
              </div>
            )}
          </div>
          <div className="setting-item">
            <label>Limite de Estoque Baixo</label>
            <input type="number" className="form-input" placeholder="10" />
          </div>
          <button className="btn-primary" onClick={onSaveCompanySettings}>
            <i className="fas fa-save"></i>
            Salvar Configurações
          </button>
        </div>

        <div className="settings-card card">
          <h3><i className="fas fa-database"></i> Dados do Sistema</h3>
          <div className="setting-item">
            <p>Backup dos dados do sistema</p>
            <button className="btn-outline">
              <i className="fas fa-download"></i>
              Fazer Backup
            </button>
          </div>
          <div className="setting-item">
            <p>Restaurar dados do backup</p>
            <button className="btn-outline">
              <i className="fas fa-upload"></i>
              Restaurar Backup
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
