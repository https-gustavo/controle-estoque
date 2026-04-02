import React from 'react';

export default function DashboardSidebar({
  activeTab,
  onChange,
  onLogout,
  sidebarOpen,
  companySettings,
  onMobileClick
}) {
  return (
    <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          {companySettings.logo ? (
            <img src={companySettings.logo} alt="Logo" className="company-logo" />
          ) : (
            <span className="logo-icon"><i className="fas fa-box"></i></span>
          )}
          <span>{companySettings.name}</span>
        </div>
      </div>
      <div className="sidebar-content">
        <ul className="nav-menu">
          <li className="nav-section">Geral</li>
          <li className="nav-item">
            <a href="#" className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={(e)=>{e.preventDefault(); onChange('dashboard'); onMobileClick();}}>
              <span className="nav-icon"><i className="fas fa-chart-bar"></i></span>
              <span>Dashboard</span>
            </a>
          </li>
          <li className="nav-section">Estoque</li>
          <li className="nav-item">
            <a href="#" className={`nav-link ${activeTab === 'produtos' ? 'active' : ''}`} onClick={(e)=>{e.preventDefault(); onChange('produtos'); onMobileClick();}}>
              <span className="nav-icon"><i className="fas fa-boxes"></i></span>
              <span>Produtos</span>
            </a>
          </li>
          <li className="nav-item">
            <a href="#" className={`nav-link ${activeTab === 'entrada' ? 'active' : ''}`} onClick={(e)=>{e.preventDefault(); onChange('entrada'); onMobileClick();}}>
              <span className="nav-icon"><i className="fas fa-arrow-down"></i></span>
              <span>Entrada</span>
            </a>
          </li>
          <li className="nav-section">Financeiro</li>
          <li className="nav-item">
            <a href="#" className={`nav-link ${activeTab === 'vendas' ? 'active' : ''}`} onClick={(e)=>{e.preventDefault(); onChange('vendas'); onMobileClick();}}>
              <span className="nav-icon"><i className="fas fa-cash-register"></i></span>
              <span>Vendas</span>
            </a>
          </li>
          <li className="nav-item">
            <a href="#" className={`nav-link ${activeTab === 'custos' ? 'active' : ''}`} onClick={(e)=>{e.preventDefault(); onChange('custos'); onMobileClick();}}>
              <span className="nav-icon"><i className="fas fa-calculator"></i></span>
              <span>Despesas</span>
            </a>
          </li>
          <li className="nav-item">
            <a href="#" className={`nav-link ${activeTab === 'precificacao' ? 'active' : ''}`} onClick={(e)=>{e.preventDefault(); onChange('precificacao'); onMobileClick();}}>
              <span className="nav-icon"><i className="fas fa-percent"></i></span>
              <span>Precificação</span>
            </a>
          </li>
          <li className="nav-section">Sistema</li>
          <li className="nav-item">
            <a href="#" className={`nav-link ${activeTab === 'historico' ? 'active' : ''}`} onClick={(e)=>{e.preventDefault(); onChange('historico'); onMobileClick();}}>
              <span className="nav-icon"><i className="fas fa-chart-line"></i></span>
              <span>Histórico</span>
            </a>
          </li>
          <li className="nav-item">
            <a href="#" className={`nav-link ${activeTab === 'api' ? 'active' : ''}`} onClick={(e)=>{e.preventDefault(); onChange('api'); onMobileClick();}}>
              <span className="nav-icon"><i className="fas fa-code"></i></span>
              <span>API</span>
            </a>
          </li>
          <li className="nav-item">
            <a href="#" className={`nav-link ${activeTab === 'configuracoes' ? 'active' : ''}`} onClick={(e)=>{e.preventDefault(); onChange('configuracoes'); onMobileClick();}}>
              <span className="nav-icon"><i className="fas fa-cog"></i></span>
              <span>Configurações</span>
            </a>
          </li>
        </ul>
      </div>
      <div className="sidebar-footer">
        <button className="btn-outline" onClick={onLogout}>
          <span className="icon"><i className="fas fa-sign-out-alt"></i></span>
          Sair
        </button>
      </div>
    </div>
  );
}

