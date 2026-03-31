import React from 'react';

export default function KPIWidget({ icon, label, value, delta, variant='primary', intent }) {
  const tone = delta == null ? null : (delta >= 0 ? 'up' : 'down');
  const fmtDelta = delta == null ? '—' : `${delta >= 0 ? '↑' : '↓'} ${Math.abs(delta).toFixed(1)}%`;
  return (
    <div className={`stat-card stat-card--${variant} ${intent ? `kpi-${intent}` : ''}`}>
      <div className="stat-icon"><i className={`fas ${icon}`} aria-hidden="true"></i></div>
      <div className="stat-content">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        <div className={`stat-delta ${tone || ''}`}>{fmtDelta}</div>
      </div>
    </div>
  );
}
