import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useDashboardData } from './useDashboardData';
import KPIGrid from './KPIGrid';
import FinanceChart from './FinanceChart';
import LowStockList from './LowStockList';
import TopProducts from './TopProducts';
import RecentSales from './RecentSales';
import QuickActions from './QuickActions';

export default function DashboardPanel({ userId, formatCurrency, showToast, onNavigate, onAdjustQuantity, onEntry }) {
  const {
    rangeFrom, rangeTo, setRangeFrom, setRangeTo, setPreset,
    loading, summary, daily, financeDaily, top, lowStock, recent, expensesRows, trend,
    loadDashboard, exportCsv
  } = useDashboardData(supabase, userId, showToast);

  const handleEmptyChartCta = () => onNavigate?.('vendas');
  const viewProduct = (p) => onNavigate?.('produtos');
  const adjustQty = (p) => onAdjustQuantity?.(p);

  useEffect(() => {
    const handler = () => loadDashboard();
    window.addEventListener('dashboard:refresh', handler);
    return () => window.removeEventListener('dashboard:refresh', handler);
  }, [loadDashboard]);

  // Dropdown de exportação
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);
  const toggleExport = () => setExportOpen(v => !v);
  useEffect(() => {
    const onDocClick = (e) => {
      if (!exportRef.current) return;
      if (!exportRef.current.contains(e.target)) setExportOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setExportOpen(false); };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <>
      <div className="page-header">
        <h2><i className="fas fa-chart-bar"></i> Dashboard</h2>
        <p className="page-subtitle">Visão geral • Última atualização: {new Date().toLocaleTimeString().slice(0,5)}</p>
      </div>

      <div className="page-box">
        <div className="toolbar">
          <div className="toolbar-group">
            <div className="form-group"><label>De</label><input type="date" className="form-input" value={rangeFrom} onChange={(e)=>setRangeFrom(e.target.value)} /></div>
            <div className="form-group"><label>Até</label><input type="date" className="form-input" value={rangeTo} onChange={(e)=>setRangeTo(e.target.value)} /></div>
          </div>
          <div className="toolbar-group">
            <button className="btn-outline" onClick={()=>setPreset('today')}>Hoje</button>
            <button className="btn-outline" onClick={()=>setPreset('7d')}>7 dias</button>
            <button className="btn-outline" onClick={()=>setPreset('30d')}>30 dias</button>
            <button className="btn-outline" onClick={()=>setPreset('month')}>Este mês</button>
          </div>
          <div className="toolbar-actions">
            <div className="export-wrap" ref={exportRef}>
              <button
                className="btn-primary export-toggle"
                onClick={toggleExport}
                aria-haspopup="menu"
                aria-expanded={exportOpen}
              >
                Exportar
                <span style={{ marginLeft:8 }}><i className={`fas fa-chevron-${exportOpen?'up':'down'}`}></i></span>
              </button>
              {exportOpen && (
                <div className="export-menu" role="menu">
                  <button className="export-item" role="menuitem" onClick={()=>{ exportCsv('vendas'); setExportOpen(false); }}>CSV Vendas</button>
                  <button className="export-item" role="menuitem" onClick={()=>{ exportCsv('top'); setExportOpen(false); }}>CSV Top</button>
                  <button className="export-item" role="menuitem" onClick={()=>{ exportCsv('low'); setExportOpen(false); }}>CSV Baixo estoque</button>
                  <button className="export-item" role="menuitem" onClick={()=>{ exportCsv('despesas'); setExportOpen(false); }}>CSV Despesas</button>
                </div>
              )}
            </div>
            <button className="btn-outline" onClick={loadDashboard} disabled={loading}>{loading?'Atualizando...':'Atualizar'}</button>
          </div>
        </div>

        <div className="stack">
          <KPIGrid summary={summary} trend={trend} formatCurrency={formatCurrency} />
        </div>

        <div className="dashboard-grid">
          <div className="stack">
            <FinanceChart rows={financeDaily} formatCurrency={formatCurrency} onEmptyCta={handleEmptyChartCta} />
            <TopProducts rows={top} formatCurrency={formatCurrency} onViewProduct={viewProduct} />
            <RecentSales sales={recent} formatCurrency={formatCurrency} />
          </div>
          <div className="stack">
            <LowStockList items={lowStock} onAdjust={adjustQty} />
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 10 }}>
                <strong>Últimas despesas</strong>
                <button className="btn-outline small" onClick={()=>onNavigate?.('custos')}>Ver</button>
              </div>
              {(expensesRows || []).length === 0 ? (
                <div className="helper-text">Nenhuma despesa no período.</div>
              ) : (
                <div style={{ display:'grid', gap: 10 }}>
                  {(expensesRows || []).slice(0, 6).map((e, idx) => (
                    <div key={idx} style={{ display:'flex', justifyContent:'space-between', gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{e.description || '—'}</div>
                        <div className="helper-text">{String(e.category || 'Geral')} • {String(e.date || '').slice(0,10).split('-').reverse().join('/')}</div>
                      </div>
                      <div style={{ fontWeight: 800, whiteSpace:'nowrap' }}>{formatCurrency(e.amount || 0)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <QuickActions
              onAddProduct={()=>onNavigate?.('produtos')}
              onGoSales={()=>onNavigate?.('vendas')}
              onEntry={onEntry}
              onApi={()=>onNavigate?.('api')}
            />
          </div>
        </div>

      </div>
    </>
  );
}
