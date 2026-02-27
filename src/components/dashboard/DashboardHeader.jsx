import React from 'react';

export default function DashboardHeader({ sidebarOpen, onToggle }) {
  return (
    <div className="dashboard-header">
      <div className="header-content">
        <button
          className={`menu-toggle ${sidebarOpen ? 'active' : ''}`}
          onClick={onToggle}
          aria-label="Alternar menu"
          aria-expanded={sidebarOpen}
        >
          <i className="fas fa-bars"></i>
        </button>
      </div>
    </div>
  );
}

