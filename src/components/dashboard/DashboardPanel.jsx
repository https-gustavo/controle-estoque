import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useDashboardData } from './useDashboardData';
import KPIGrid from './KPIGrid';
import FinanceChart from './FinanceChart';
import LowStockList from './LowStockList';
import TopProducts from './TopProducts';
import RecentSales from './RecentSales';
import QuickActions from './QuickActions';

export default function DashboardPanel({ userId, demo, formatCurrency, showToast, onNavigate, onAdjustQuantity, onEntry }) {
  const {
    rangeFrom, rangeTo, setRangeFrom, setRangeTo, setPreset,
    loading, summary, daily, financeDaily, top, lowStock, recent, expensesRows, trend,
    loadDashboard, exportCsv
  } = useDashboardData(supabase, userId, showToast, { demo });

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

  const printAudit = () => {
    const fmt = (v)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    const h = (t)=>`<h2 style="margin:0 0 8px;font-weight:900;letter-spacing:-0.02em">${t}</h2>`;
    const sub = (t)=>`<div style="color:#64748b;margin:0 0 12px;font-weight:700">${t}</div>`;
    const kv = (k,v)=>`<div style="display:flex;justify-content:space-between;margin:6px 0"><span style="color:#475569;font-weight:800">${k}</span><span style="font-weight:900">${v}</span></div>`;
    const table = (headers, rows)=>`<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:6px">${`<thead><tr>${headers.map(h=>`<th style="text-align:left;border-bottom:1px solid #e2e8f0;padding:8px 6px;background:#f8fafc">${h}</th>`).join('')}</tr></thead>`}<tbody>${rows.map(r=>`<tr>${r.map(c=>`<td style="border-bottom:1px solid #f1f5f9;padding:8px 6px">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const dailyRows = (daily||[]).map(r=>[String(r.day), fmt(r.total), r.items]);
    const lowRows = (lowStock||[]).map(r=>[r.name, r.barcode||'—', r.quantity]);
    const topRows = (top||[]).map(r=>[r.name, r.barcode||'—', r.qty, fmt(r.revenue)]);
    const expRows = (expensesRows||[]).map(e=>[String(e.date||'').slice(0,10), e.category||'Geral', e.description||'—', fmt(e.amount||0)]);
    const doc = `
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Auditoria ${rangeFrom} a ${rangeTo}</title>
        <style>
          @media print { @page { size: A4; margin: 12mm; } body { -webkit-print-color-adjust: exact; } }
          body { font-family: Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#0f172a; }
          .header { display:flex;justify-content:space-between;align-items:center;margin-bottom:10px }
          .brand { font-weight:900;letter-spacing:-0.02em }
          .grid { display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:10px 0 18px }
          .card { border:1px solid #e2e8f0;border-radius:10px;padding:10px }
        </style>
      </head>
      <body>
        <div class="header"><div class="brand">Tech Estoque</div><div>${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div></div>
        ${h('Auditoria do sistema')}
        ${sub(`Período: ${rangeFrom.split('-').reverse().join('/')} a ${rangeTo.split('-').reverse().join('/')}`)}
        <div class="grid">
          <div>${kv('Receita', fmt(summary.revenue))}${kv('Itens vendidos', summary.items)}${kv('Ticket médio', fmt(summary.avgTicket))}</div>
          <div>${kv('Despesas', fmt(summary.expenses))}${kv('Lucro líquido', fmt(summary.netProfit))}${kv('Estoque (custo)', fmt(summary.stockInvested))}</div>
        </div>
        <div class="card">
          ${h('Vendas por dia')}${table(['Dia','Receita','Itens'], dailyRows)}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
          <div class="card">${h('Top produtos')}${table(['Produto','Código','Qtd','Receita'], topRows)}</div>
          <div class="card">${h('Baixo estoque')}${table(['Produto','Código','Qtd'], lowRows)}</div>
        </div>
        <div class="card" style="margin-top:12px">
          ${h('Despesas')}${table(['Data','Categoria','Descrição','Valor'], expRows)}
        </div>
      </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(doc);
    w.document.close();
    w.focus();
    setTimeout(()=>w.print(), 300);
  };

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
            <button className="btn-outline" onClick={printAudit}>Imprimir auditoria</button>
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
