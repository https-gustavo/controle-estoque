export function printReceipt({ companyName, title, code, date, items, subtotal, discount, total }) {
  const fmt = (v)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const d = date instanceof Date ? date : new Date(date || Date.now());
  const safe = (s)=>String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const doc = `
    <html><head><meta charset="utf-8"/><title>${safe(title || 'Comprovante')}</title>
    <style>
      @media print { @page { size: A4; margin: 12mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      body { font-family: Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#0f172a; }
      .top { display:flex; justify-content:space-between; align-items:flex-start; gap: 12px; margin-bottom: 12px; }
      .brand { font-weight: 950; letter-spacing:-0.02em; font-size: 16px; }
      .meta { color:#475569; font-weight: 700; font-size: 12px; text-align:right; }
      .box { border:1px solid #e2e8f0; border-radius: 12px; padding: 10px 12px; margin-bottom: 12px; background:#fff; }
      .kvs { display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .kv { display:flex; justify-content:space-between; gap: 10px; }
      .kv .k { color:#475569; font-weight: 800; }
      .kv .v { font-weight: 950; }
      table { width:100%; border-collapse:collapse; }
      th, td { padding:8px 8px; border-bottom:1px solid #e2e8f0; font-size:12px; }
      th { text-align:left; background:#f8fafc; color:#0f172a; font-weight: 900; }
      td.num, th.num { text-align:right; white-space:nowrap; }
      tbody tr:nth-child(even) td { background:#fbfdff; }
      tfoot td { font-weight: 950; }
      .foot { margin-top: 14px; color:#64748b; font-weight: 700; font-size: 12px; display:flex; justify-content:space-between; }
    </style></head><body>
      <div class="top">
        <div>
          <div class="brand">${safe(companyName || 'Tech Estoque')}</div>
          <div style="color:#64748b;font-weight:800">${safe(title || 'Comprovante')}</div>
        </div>
        <div class="meta">
          <div>${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
          ${code ? `<div>Código: ${safe(code)}</div>` : ``}
        </div>
      </div>

      <div class="box">
        <div class="kvs">
          <div class="kv"><span class="k">Subtotal</span><span class="v">${fmt(subtotal)}</span></div>
          <div class="kv"><span class="k">Desconto</span><span class="v">${discount > 0 ? `-${fmt(discount)}` : fmt(0)}</span></div>
          <div class="kv"><span class="k">Total</span><span class="v">${fmt(total)}</span></div>
          <div class="kv"><span class="k">Itens</span><span class="v">${Array.isArray(items) ? items.reduce((a,b)=>a+Number(b.qty||0),0) : 0}</span></div>
        </div>
      </div>

      <table>
        <thead><tr>
          <th>Produto</th>
          <th>Código</th>
          <th class="num">Qtd</th>
          <th class="num">Unitário</th>
          <th class="num">Total</th>
        </tr></thead>
        <tbody>
          ${(Array.isArray(items) ? items : []).map(r=>`<tr>
            <td>${safe(r.name)}</td>
            <td>${safe(r.barcode || '—')}</td>
            <td class="num">${Number(r.qty || 0)}</td>
            <td class="num">${fmt(r.unit)}</td>
            <td class="num">${fmt(r.total)}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr><td colspan="4" class="num">Subtotal</td><td class="num">${fmt(subtotal)}</td></tr>
          ${discount > 0 ? `<tr><td colspan="4" class="num">Desconto</td><td class="num">-${fmt(discount)}</td></tr>` : ``}
          <tr><td colspan="4" class="num">Total</td><td class="num">${fmt(total)}</td></tr>
        </tfoot>
      </table>

      <div class="foot">
        <div>Gerado pelo sistema</div>
        <div>Obrigado pela preferência</div>
      </div>
    </body></html>
  `;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(doc);
  w.document.close();
  w.focus();
  setTimeout(()=>w.print(), 250);
}
