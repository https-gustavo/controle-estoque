import { useMemo, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { demoApi } from '../demo/demoApi';
import { formatDateBR, formatTimeBR, toDateTimeKeyBR } from '../utils/dateBR';
import { printReceipt } from '../utils/printReceipt';
import '../styles/SalesHistory.css';
const SalesHistory = ({ userId, demo, showToast, formatCurrency }) => {
  const [salesHistoryGroups, setSalesHistoryGroups] = useState([]);
  const [entryHistoryGroups, setEntryHistoryGroups] = useState([]);
  const [historyMode, setHistoryMode] = useState('vendas'); // vendas | entradas
  const [historyFilter, setHistoryFilter] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState('all');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  
  const [showSaleDetailsModal, setShowSaleDetailsModal] = useState(false);
  const [selectedSaleGroup, setSelectedSaleGroup] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editRows, setEditRows] = useState([]);
  const [saving, setSaving] = useState(false);

  const fetchSalesHistory = async () => {
    if (!userId) return;

    try {
      if (demo || userId === 'demo') {
        const salesData = demoApi.listSales();
        const productsData = demoApi.listProducts();
        const salesWithProducts = salesData.map(sale => {
          const date = sale.sale_date || sale.date || sale.created_at;
          const total = sale.total_price ?? sale.total ?? sale.totalPrice ?? 0;
          return {
            ...sale,
            date,
            total,
            products: productsData.find(p => p.id === sale.product_id) || productsData.find(p => String(p.barcode || '') === String(sale.barcode || ''))
          };
        });
        const grouped = salesWithProducts.reduce((acc, sale) => {
          const key = toDateTimeKeyBR(sale.date);
          if (!key) return acc;
          if (!acc[key]) {
            acc[key] = {
              key,
              saleId: sale.id || null,
              date: sale.date,
              items: [],
              total: 0
            };
          } else if (!acc[key].saleId && sale.id) {
            acc[key].saleId = sale.id;
          }
          const saleTotal = sale.total || 0;
          acc[key].items.push({ ...sale, total: saleTotal });
          acc[key].total += saleTotal;
          return acc;
        }, {});
        const groupedArray = Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date));
      setSalesHistoryGroups(groupedArray);
      // Entradas demo
      const moves = demoApi.listMovements?.() || [];
      const entries = moves.filter(m => m.type === 'entrada');
      const emap = entries.map(m => ({
        date: m.occurred_at || m.date,
        total: Number(m.quantity || 0) * Number(m.cost_unit || 0),
        items: [{ products: { name: m.product_name || 'Produto', barcode: m.barcode || '' }, quantity: Number(m.quantity || 0), unit_price: Number(m.cost_unit || 0), total: Number(m.quantity || 0) * Number(m.cost_unit || 0) }]
      }));
      const eGrouped = emap.reduce((acc, e) => {
        const key = toDateTimeKeyBR(e.date);
        if (!key) return acc;
        if (!acc[key]) acc[key] = { key, date: e.date, items: [], total: 0 };
        acc[key].items.push(e.items[0]);
        acc[key].total += e.total;
        return acc;
      }, {});
      setEntryHistoryGroups(Object.values(eGrouped).sort((a,b)=> new Date(b.date) - new Date(a.date)));
        return;
      }
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (salesError) {
        showToast?.('Erro ao carregar histórico de vendas', 'danger');
        return;
      }

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId);

      if (productsError) {
        showToast?.('Erro ao carregar produtos', 'danger');
        return;
      }

      const salesWithProducts = salesData.map(sale => {
        const date = sale.sale_date || sale.date || sale.created_at;
        const total = sale.total_price ?? sale.total ?? sale.totalPrice ?? 0;
        return {
          ...sale,
          date,
          total,
          products: productsData.find(p => p.id === sale.product_id)
        };
      });

      const grouped = salesWithProducts.reduce((acc, sale) => {
        const saleDate = new Date(sale.date);
        if (isNaN(saleDate.getTime())) {
          return acc;
        }

        const dateKey = toDateTimeKeyBR(saleDate);
        if (!dateKey) return acc;

        if (!acc[dateKey]) {
          acc[dateKey] = {
            key: dateKey,
            saleId: sale.id || null,
            date: sale.date,
            items: [],
            total: 0
          };
        } else if (!acc[dateKey].saleId && sale.id) {
          acc[dateKey].saleId = sale.id;
        }
        
        const saleTotal = sale.total || 0;
        acc[dateKey].items.push({
          ...sale,
          total: saleTotal
        });
        acc[dateKey].total += saleTotal;
        
        return acc;
      }, {});

      const groupedArray = Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date));
      setSalesHistoryGroups(groupedArray);
      // Entradas reais
      try {
        const { data: movs, error: movErr } = await supabase
          .from('stock_movements')
          .select('product_id,quantity,cost_unit,occurred_at,created_at,batch_id')
          .eq('user_id', userId)
          .eq('type', 'entrada')
          .order('created_at', { ascending: false })
          .limit(5000);
        if (movErr) throw movErr;
        const entriesRaw = Array.isArray(movs) ? movs : [];
        const ids = Array.from(new Set(entriesRaw.map(m => m.product_id).filter(Boolean)));
        let prodMap = new Map();
        if (ids.length) {
          const { data: pData, error: pErr } = await supabase
            .from('products')
            .select('id,name,barcode')
            .eq('user_id', userId)
            .in('id', ids);
          if (pErr) throw pErr;
          prodMap = new Map((Array.isArray(pData) ? pData : []).map(p => [String(p.id), p]));
        }

        const eGrouped = entriesRaw.reduce((acc, m) => {
          const when = m.occurred_at || m.created_at;
          const key = m.batch_id ? `batch:${m.batch_id}` : toDateTimeKeyBR(when);
          if (!key) return acc;
          if (!acc[key]) acc[key] = { key, date: when, items: [], total: 0 };
          const p = prodMap.get(String(m.product_id || '')) || {};
          const qty = Number(m.quantity || 0);
          const unit = Number(m.cost_unit || 0);
          const item = {
            products: { name: p.name || 'Produto', barcode: p.barcode || '' },
            quantity: qty,
            unit_price: unit,
            total: qty * unit
          };
          acc[key].items.push(item);
          acc[key].total += item.total;
          const prevTs = new Date(acc[key].date).getTime();
          const curTs = new Date(when).getTime();
          if (!Number.isNaN(prevTs) && !Number.isNaN(curTs) && curTs < prevTs) acc[key].date = when;
          return acc;
        }, {});
        setEntryHistoryGroups(Object.values(eGrouped).sort((a,b)=> new Date(b.date) - new Date(a.date)));
      } catch (e) {
        showToast?.(e?.message || 'Erro ao carregar histórico de entradas', 'danger');
      }
    } catch (error) {
      showToast?.('Erro ao carregar histórico de vendas', 'danger');
    }
  };

  useEffect(() => {
    fetchSalesHistory();
  }, [userId]);

  useEffect(() => {
    fetchSalesHistory();
  }, [historyMode]);

  useEffect(() => {
    const handler = () => fetchSalesHistory();
    window.addEventListener('dashboard:refresh', handler);
    return () => window.removeEventListener('dashboard:refresh', handler);
  }, [userId]);

  const qRaw = String(historyFilter || '');
  const q = qRaw.toLowerCase().trim();
  const qDigits = q.replace(/\D/g, '');
  const idOnlySearch = Boolean(qDigits) && /^\s*(id[:#]?\s*)?\d+\s*$/i.test(qRaw);

  const sourceGroups = historyMode === 'entradas' ? entryHistoryGroups : salesHistoryGroups;
  const filteredSalesHistoryGroups = sourceGroups.filter(group => {
    if (historyFilter) {
      const idDigits = String(group.saleId || '').replace(/\D/g, '');
      if (idOnlySearch) return idDigits.includes(qDigits);
      const idMatch = qDigits ? idDigits.includes(qDigits) : String(group.saleId || '').toLowerCase().includes(q);
      if (idMatch) return true;
      const hasMatchingProduct = group.items.some(item => {
        const productName = item.products?.name || '';
        const productBarcode = item.products?.barcode || '';
        return productName.toLowerCase().includes(q) ||
               productBarcode.toLowerCase().includes(q);
      });
      if (!hasMatchingProduct) return false;
    }

    // Aplica filtro por período quando necessário
    if (historyDateFilter !== 'all') {
      const saleDate = new Date(group.date);
      if (isNaN(saleDate.getTime())) {
        return false;
      }
      
      const now = new Date();
      
      switch (historyDateFilter) {
        case 'today':
          return saleDate.toDateString() === now.toDateString();
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return saleDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return saleDate >= monthAgo;
        default:
          return true;
      }
    }

    return true;
  });

  const historyTotalPages = Math.max(1, Math.ceil((filteredSalesHistoryGroups?.length || 0) / historyPageSize));
  const clampedPage = Math.max(1, Math.min(historyPage, historyTotalPages));
  const startIdx = (clampedPage - 1) * historyPageSize;
  // Pega apenas os itens da página atual para otimizar a renderização
  const pagedFilteredSalesHistoryGroups = filteredSalesHistoryGroups.slice(startIdx, startIdx + historyPageSize);

  // Funções de navegação da paginação
  const goNextHistoryPage = () => {
    if (clampedPage < historyTotalPages) {
      setHistoryPage(clampedPage + 1);
    }
  };

  const goPrevHistoryPage = () => {
    if (clampedPage > 1) {
      setHistoryPage(clampedPage - 1);
    }
  };

  // Atualiza tamanho da página e reseta para primeira página
  const handlePageSizeChange = (newSize) => {
    setHistoryPageSize(parseInt(newSize));
    setHistoryPage(1);
  };

  // Abre modal com detalhes da venda selecionada
  const handleViewSaleDetails = (group) => {
    setSelectedSaleGroup(group);
    setShowSaleDetailsModal(true);
    setEditMode(false);
    const rows = (group?.items || []).map(i => ({
      id: i.id,
      product_id: i.product_id,
      name: (i.products?.name && i.products.name.trim()) || (i.product_name || 'Produto'),
      barcode: i.products?.barcode || i.barcode || '',
      prevQty: Number(i.quantity || 0),
      qty: Number(i.quantity || 0),
      prevUnit: Number(i.unit_price || 0),
      unit: Number(i.unit_price || 0),
      cost_unit: Number(i.products?.cost_price || 0)
    }));
    setEditRows(rows);
  };

  const printSaleGroup = (group) => {
    if (!group) return;
    const rows = (group.items||[]).map(i=>({
      name: (i.products?.name && i.products.name.trim()) || (i.product_name || 'Produto'),
      barcode: i.products?.barcode || i.barcode || '',
      qty: Number(i.quantity || 1),
      unit: Number(i.unit_price || 0),
      total: Number(i.total || 0) || (Number(i.unit_price||0) * Number(i.quantity||1))
    }));
    const subtotal = rows.reduce((a,b)=>a+Number(b.total||0),0);
    const ts = new Date(group.date);
    printReceipt({ companyName: 'Tech Estoque', title: 'Comprovante de venda', code: group.saleId ? `ID ${group.saleId}` : (group.key || null), date: ts, items: rows, subtotal, discount: 0, total: subtotal });
  };

  const editTotals = useMemo(() => {
    const subtotal = editRows.reduce((a, r) => a + (Number(r.qty || 0) * Number(r.unit || 0)), 0);
    return { subtotal, total: subtotal };
  }, [editRows]);

  const saveMovement = async ({ product_id, type, quantity, cost_unit, occurred_at }) => {
    if (!product_id || !(quantity > 0)) return;
    try {
      const modern = { user_id: userId, product_id, type, quantity, cost_unit, occurred_at };
      const legacy = { user_id: userId, product_id, type, quantity };
      let { error } = await supabase.from('stock_movements').insert([modern]);
      if (error) ({ error } = await supabase.from('stock_movements').insert([legacy]));
    } catch {}
  };

  const applyEdits = async () => {
    if (!selectedSaleGroup) return;
    if (demo || userId === 'demo') { showToast?.('Edição não disponível no modo demonstração', 'danger'); return; }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      for (const r of editRows) {
        const newQty = Math.max(0, parseInt(String(r.qty || 0), 10) || 0);
        const newUnit = Number(r.unit || 0);
        const oldQty = Number(r.prevQty || 0);
        const diff = newQty - oldQty;
        const total_price = newQty * newUnit;
        const cost_total = Number(r.cost_unit || 0) * newQty;
        const patch = { quantity: newQty, unit_price: newUnit, total_price, total: total_price, cost_total, profit: total_price - cost_total, sale_date: selectedSaleGroup.date, date: selectedSaleGroup.date };
        const tryUpdate = async (payload) => supabase.from('sales').update(payload).eq('id', r.id).eq('user_id', userId);
        let { error } = await tryUpdate(patch);
        if (error && String(error.message || '').toLowerCase().includes('profit')) {
          const { profit, cost_total, ...rest } = patch;
          ({ error } = await tryUpdate(rest));
        }
        if (error && String(error.message || '').toLowerCase().includes('total_price')) {
          const { total_price, sale_date, ...rest } = patch;
          ({ error } = await tryUpdate(rest));
        }
        if (error) throw error;
        if (diff !== 0 && r.product_id) {
          const { data: prod } = await supabase.from('products').select('id,quantity,cost_price').eq('id', r.product_id).eq('user_id', userId).maybeSingle();
          const current = Number(prod?.quantity || 0);
          const nextQty = Math.max(0, current - diff);
          const { error: upErr } = await supabase.from('products').update({ quantity: nextQty }).eq('id', r.product_id).eq('user_id', userId);
          if (upErr) throw upErr;
          if (diff > 0) await saveMovement({ product_id: r.product_id, type: 'saida', quantity: diff, cost_unit: Number(prod?.cost_price || 0), occurred_at: now });
          if (diff < 0) await saveMovement({ product_id: r.product_id, type: 'entrada', quantity: Math.abs(diff), cost_unit: Number(prod?.cost_price || 0), occurred_at: now });
        }
      }
      showToast?.('Venda atualizada', 'success');
      setShowSaleDetailsModal(false);
      setSelectedSaleGroup(null);
      fetchSalesHistory();
      try { window.dispatchEvent(new Event('dashboard:refresh')); } catch {}
    } catch (e) {
      showToast?.(e?.message || 'Falha ao atualizar venda', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const registerReturn = async () => {
    if (!selectedSaleGroup) return;
    if (!window.confirm('Registrar devolução (estorno) desta venda?')) return;
    const now = new Date().toISOString();
    try {
      if (demo || userId === 'demo') {
        const neg = (selectedSaleGroup.items || []).map(i => ({ id: i.product_id || i.id, name: i.product_name || i.products?.name || 'Produto', barcode: i.barcode || i.products?.barcode || '', unit_price: Number(i.unit_price||0), quantity: -Math.abs(Number(i.quantity||0)) }));
        demoApi.recordSale({ items: neg, discountValue: 0 });
        showToast?.('Devolução registrada (demo)', 'success');
        fetchSalesHistory();
        try { window.dispatchEvent(new Event('dashboard:refresh')); } catch {}
        return;
      }
      let restocked = 0;
      let skipped = 0;
      const resolveProductId = async (it) => {
        const direct = it?.product_id || it?.products?.id;
        if (direct) return direct;
        const barcode = String(it?.barcode || it?.products?.barcode || '').trim();
        if (barcode) {
          const { data } = await supabase
            .from('products')
            .select('id')
            .eq('user_id', userId)
            .eq('barcode', barcode)
            .maybeSingle();
          if (data?.id) return data.id;
        }
        const name = String(it?.product_name || it?.products?.name || '').trim();
        if (name) {
          const { data } = await supabase
            .from('products')
            .select('id')
            .eq('user_id', userId)
            .ilike('name', name)
            .limit(1);
          const row = Array.isArray(data) ? data[0] : data;
          if (row?.id) return row.id;
        }
        return null;
      };

      for (const it of (selectedSaleGroup.items || [])) {
        const qty = Math.abs(Number(it.quantity || 0));
        if (!(qty > 0)) { skipped += 1; continue; }
        const pid = await resolveProductId(it);
        if (!pid) { skipped += 1; continue; }
        const unit = Number(it.unit_price || 0);
        const total = -(qty * unit);
        const costUnit = Number(it.products?.cost_price || 0);
        const costTotal = -(costUnit * qty);
        const row = { user_id: userId, product_id: pid, product_name: it.product_name || it.products?.name || 'Produto', barcode: it.barcode || it.products?.barcode || null, quantity: -qty, unit_price: unit, total_price: total, total, cost_total: costTotal, profit: total - costTotal, sale_date: now };
        const tryInsert = async (payload) => supabase.from('sales').insert([payload]);
        let { error } = await tryInsert(row);
        if (error && String(error.message || '').toLowerCase().includes('profit')) {
          const { profit, cost_total, ...rest } = row;
          ({ error } = await tryInsert(rest));
        }
        if (error && String(error.message || '').toLowerCase().includes('total_price')) {
          const { total_price, sale_date, ...rest } = row;
          ({ error } = await tryInsert(rest));
        }
        if (error) throw error;
        const { data: prod } = await supabase.from('products').select('id,quantity,cost_price').eq('id', pid).eq('user_id', userId).maybeSingle();
        const cur = Number(prod?.quantity || 0);
        const next = cur + qty;
        const { error: upErr } = await supabase.from('products').update({ quantity: next }).eq('id', pid).eq('user_id', userId);
        if (upErr) throw upErr;
        await saveMovement({ product_id: pid, type: 'entrada', quantity: qty, cost_unit: Number(prod?.cost_price || 0), occurred_at: now });
        restocked += 1;
      }
      if (restocked > 0 && skipped === 0) showToast?.('Devolução registrada', 'success');
      else if (restocked > 0 && skipped > 0) showToast?.(`Devolução registrada (${restocked} itens). ${skipped} itens ignorados por falta de vínculo com produto.`, 'success');
      else showToast?.('Não foi possível devolver: itens sem produto vinculado', 'danger');
      setShowSaleDetailsModal(false);
      setSelectedSaleGroup(null);
      fetchSalesHistory();
      try { window.dispatchEvent(new Event('dashboard:refresh')); } catch {}
    } catch (e) {
      showToast?.(e?.message || 'Falha ao registrar devolução', 'danger');
    }
  };

  return (
    <div className="sales-history-page">
      <div className="page-header">
        <h2><i className="fas fa-chart-line"></i> Histórico</h2>
        <p className="page-subtitle">Vendas e entradas de estoque.</p>
      </div>

      <div className="sales-history card">
        <div className="history-header">
          <div className="history-controls">
            <div className="history-tabs" style={{ display:'flex', gap: 8, alignItems:'center' }}>
              <button className={`btn-outline ${historyMode==='vendas'?'active':''}`} onClick={()=>{ setHistoryMode('vendas'); setHistoryPage(1); }}>Vendas</button>
              <button className={`btn-outline ${historyMode==='entradas'?'active':''}`} onClick={()=>{ setHistoryMode('entradas'); setHistoryPage(1); }}>Entradas</button>
            </div>
            <div className="history-filters">
              <input 
                type="text" 
                placeholder="Buscar por ID (ex: 862 ou ID 862), produto ou código..." 
                className="filter-input"
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
              />
              <select className="filter-select" value={historyDateFilter} onChange={(e) => setHistoryDateFilter(e.target.value)}>
                <option value="all">Todas as datas</option>
                <option value="today">Hoje</option>
                <option value="week">Esta semana</option>
                <option value="month">Este mês</option>
              </select>
            </div>
            <div className="history-pagination">
              <select className="page-size-select" value={historyPageSize} onChange={(e) => handlePageSizeChange(e.target.value)}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
              <div className="pagination">
                <button className="btn-outline" onClick={goPrevHistoryPage} disabled={clampedPage === 1}>
                  ← Anterior
                </button>
                <span className="page-indicator">Página {clampedPage} de {historyTotalPages}</span>
                <button className="btn-outline" onClick={goNextHistoryPage} disabled={clampedPage === historyTotalPages}>
                  Próxima →
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {filteredSalesHistoryGroups && filteredSalesHistoryGroups.length > 0 ? (
          <div className="history-content">
            <div className="history-summary">
              <div className="summary-card">
                <div className="summary-icon"><i className="fas fa-shopping-cart"></i></div>
                <div className="summary-info">
                  <div className="summary-value">{filteredSalesHistoryGroups.length}</div>
                  <div className="summary-label">Vendas</div>
                </div>
              </div>
              <div className="summary-card">
                <div className="summary-icon"><i className="fas fa-dollar-sign"></i></div>
                <div className="summary-info">
                  <div className="summary-value">{formatCurrency(filteredSalesHistoryGroups.reduce((acc, group) => acc + group.total, 0))}</div>
                  <div className="summary-label">Total</div>
                </div>
              </div>
              <div className="summary-card">
                <div className="summary-icon"><i className="fas fa-box"></i></div>
                <div className="summary-info">
                  <div className="summary-value">{filteredSalesHistoryGroups.reduce((acc, group) => acc + group.items.length, 0)}</div>
                  <div className="summary-label">Itens</div>
                </div>
              </div>
            </div>
            
            <div className="history-list">
              {pagedFilteredSalesHistoryGroups.map(group => (
                <div className="history-item-card" key={group.key || group.date}>
                  <div className="history-card-header">
                    <div className="history-date">
                      <i className="fas fa-calendar-alt"></i>
                      <span>{formatDateBR(group.date)} {formatTimeBR(group.date)}</span>
                    </div>
                    <div className="history-total">
                      <span className="total-label">Total:</span>
                      <span className="total-value">{formatCurrency(group.total)}</span>
                    </div>
                  </div>
                  <div className="history-meta-row">
                    <span className="history-sale-id"><span className="history-sale-id-label">{historyMode==='entradas'?'Entrada':'Venda'}</span> {group.saleId || group.key}</span>
                  </div>
                  
                  <div className="history-items">
                    {group.items.map((item, idx) => (
                      <div className="history-product-item" key={idx}>
                        <div className="product-info">
                          <div className="product-name">{
                            (item.products?.name && item.products.name.trim()) || 
                            (item.products?.barcode ? `Produto ${item.products.barcode}` : 'Produto sem nome')
                          }</div>
                          <div className="product-details">
                            {item.products?.barcode && <span className="product-barcode">#{item.products.barcode}</span>}
                            <span className="product-quantity">Qtd: {item.quantity}</span>
                            <span className="product-unit-price">{historyMode==='entradas'?'Custo:':'Unit:'} {formatCurrency(item.unit_price || 0)}</span>
                          </div>
                        </div>
                        <div className="product-total">
                          {formatCurrency(item.total || 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="history-card-footer">
                    <div className="items-count">
                      <i className="fas fa-box"></i>
                      {group.items.length} {group.items.length === 1 ? 'item' : 'itens'}
                    </div>
                    <div className="sale-actions">
                      <button className="btn-outline btn-sm" onClick={() => handleViewSaleDetails(group)}>
                        <i className="fas fa-eye"></i> Detalhes
                      </button>
                      <button className="btn-outline btn-sm" onClick={() => printSaleGroup(group)}>
                        <i className="fas fa-print"></i> Imprimir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon"><i className="fas fa-shopping-cart"></i></div>
            <h4>Nenhuma venda encontrada</h4>
            <p>Não há vendas registradas {historyFilter || historyDateFilter !== 'all' ? 'com os filtros aplicados' : 'ainda'}.</p>
          </div>
        )}
      </div>

      {/* Modal de Detalhes da Venda */}
      {showSaleDetailsModal && selectedSaleGroup && (
        <div className="modal-overlay" onClick={() => setShowSaleDetailsModal(false)}>
          <div className="modal sale-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-receipt"></i> Detalhes da Venda</h3>
              <button className="close-btn" onClick={() => setShowSaleDetailsModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="sale-info">
                <div className="sale-info-row">
                  <span className="label">Data e Hora:</span>
                  <span className="value">
                    {new Date(selectedSaleGroup.date).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="sale-info-row">
                  <span className="label">Código:</span>
                  <span className="value">{selectedSaleGroup.saleId || selectedSaleGroup.key || '—'}</span>
                </div>
                <div className="sale-info-row">
                  <span className="label">Total de Itens:</span>
                  <span className="value">{selectedSaleGroup.items.length}</span>
                </div>
                <div className="sale-info-row total-row">
                  <span className="label">Valor Total:</span>
                  <span className="total-value">{formatCurrency(selectedSaleGroup.total)}</span>
                </div>
              </div>
              
              <div className="items-section">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap: 10, marginBottom: 10 }}>
                  <h3 style={{ margin: 0 }}>Itens</h3>
                  <div style={{ display:'flex', gap: 10, flexWrap:'wrap', justifyContent:'flex-end' }}>
                    <button className="btn-outline btn-sm" onClick={()=>setEditMode(v=>!v)} disabled={saving}>
                      <i className="fas fa-pen"></i> {editMode ? 'Cancelar edição' : 'Editar venda'}
                    </button>
                    <button className="btn-outline btn-sm" onClick={registerReturn} disabled={saving}>
                      <i className="fas fa-undo"></i> Devolução
                    </button>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="products-table">
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Código</th>
                        <th className="num">Qtd</th>
                        <th className="num">Unitário</th>
                        <th className="num">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(editMode ? editRows : editRows.map(r=>({ ...r, qty: r.prevQty, unit: r.prevUnit }))).map((r, idx) => (
                        <tr key={r.id || idx}>
                          <td className="name">{r.name}</td>
                          <td>{r.barcode || '—'}</td>
                          <td className="num">
                            {editMode ? (
                              <input className="form-input" style={{ width: 92 }} type="number" min="0" value={r.qty} onChange={(e)=>setEditRows(prev=>prev.map(x=>x.id===r.id?{...x, qty:e.target.value}:x))} />
                            ) : (
                              Number(r.prevQty || 0)
                            )}
                          </td>
                          <td className="num">
                            {editMode ? (
                              <input className="form-input" style={{ width: 120 }} type="number" step="0.01" min="0" value={r.unit} onChange={(e)=>setEditRows(prev=>prev.map(x=>x.id===r.id?{...x, unit:e.target.value}:x))} />
                            ) : (
                              formatCurrency(r.prevUnit || 0)
                            )}
                          </td>
                          <td className="num">{formatCurrency(Number((editMode ? r.qty : r.prevQty) || 0) * Number((editMode ? r.unit : r.prevUnit) || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                    {editMode && (
                      <tfoot>
                        <tr>
                          <td colSpan={4} className="num">Total</td>
                          <td className="num">{formatCurrency(editTotals.total)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setShowSaleDetailsModal(false)} disabled={saving}>Fechar</button>
              {historyMode==='entradas' ? (
                <button className="btn-primary" onClick={() => printSaleGroup(selectedSaleGroup)}>
                  <i className="fas fa-print"></i> Imprimir
                </button>
              ) : editMode ? (
                <button className="btn-success" onClick={applyEdits} disabled={saving}>
                  <i className="fas fa-save"></i> {saving ? 'Salvando...' : 'Salvar alterações'}
                </button>
              ) : (
                <button className="btn-primary" onClick={() => printSaleGroup(selectedSaleGroup)}>
                  <i className="fas fa-print"></i> Imprimir
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;
