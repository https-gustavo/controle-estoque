import React from 'react';
import KPIWidget from './KPIWidget';

export default function KPIGrid({ summary, trend, formatCurrency }) {
  const primary = [
    { icon:'fa-solid fa-coins', label:'Receita', value: formatCurrency(summary.revenue||0), delta: trend?.revenue, intent:'revenue' },
    { icon:'fa-solid fa-chart-line', label:'Lucro líquido', value: formatCurrency(summary.netProfit||0), delta: null, intent:'profit' },
    { icon:'fa-solid fa-circle-minus', label:'Despesas', value: formatCurrency(summary.expenses||0), delta: null, intent:'expenses' },
    { icon:'fa-solid fa-box', label:'Custo produtos', value: formatCurrency(summary.cogs||0), delta: null, intent:'cogs' },
  ];
  const secondary = [
    { icon:'fa-solid fa-wallet', label:'Investido em estoque', value: formatCurrency(summary.stockInvested||0), delta: null, intent:'stockinvested' },
    { icon:'fa-solid fa-money-bill-trend-up', label:'Potencial de venda', value: formatCurrency(summary.stockPotential||0), delta: null, intent:'stockpotential' },
    { icon:'fa-solid fa-percent', label:'Margem geral', value: summary.grossMarginPct != null ? `${Number(summary.grossMarginPct).toFixed(1)}%` : '—', delta: null, intent:'margin' },
  ];
  return (
    <>
      <div className="kpi-grid kpi-grid--primary">
        {primary.map((it, idx)=>(
          <KPIWidget key={`p-${idx}`} icon={it.icon} label={it.label} value={it.value} delta={it.delta} variant="primary" intent={it.intent} />
        ))}
      </div>
      <div className="kpi-grid kpi-grid--secondary">
        {secondary.map((it, idx)=>(
          <KPIWidget key={`s-${idx}`} icon={it.icon} label={it.label} value={it.value} delta={it.delta} variant="secondary" intent={it.intent} />
        ))}
      </div>
    </>
  );
}
