import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { demoApi } from '../../demo/demoApi';
import { toDayKeyBR } from '../../utils/dateBR';

export function useDashboardData(supabase, userId, showToast, options = {}) {
  const normDay = (v) => {
    if (!v) return '';
    if (typeof v === 'string') return v.slice(0, 10);
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return toDayKeyBR(d);
    return String(v).slice(0, 10);
  };

  const dateIter = (from, to) => {
    const start = new Date(`${String(from).slice(0, 10)}T12:00:00`);
    const end = new Date(`${String(to).slice(0, 10)}T12:00:00`);
    const out = [];
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return out;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      out.push(toDayKeyBR(d));
    }
    return out;
  };

  const [rangeFrom, setRangeFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0,10);
  });
  const [rangeTo, setRangeTo] = useState(() => new Date().toISOString().slice(0,10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState({
    revenue: 0,
    orders: 0,
    items: 0,
    avgTicket: 0,
    products: 0,
    lowStock: 0,
    stockValue: null,
    expenses: 0,
    cogs: 0,
    netProfit: 0,
    stockInvested: 0,
    stockPotential: 0,
    grossMarginPct: null
  });
  const [daily, setDaily] = useState([]); // [{day,total,items}]
  const [financeDaily, setFinanceDaily] = useState([]); // [{day,revenue,expenses,profit}]
  const [top, setTop] = useState([]);     // [{id,name,barcode,qty,revenue,margin}]
  const [lowStock, setLowStock] = useState([]); // [{id,name,barcode,quantity}]
  const [recent, setRecent] = useState([]); // últimas vendas opcionais
  const [expensesRows, setExpensesRows] = useState([]); // despesas no período (export/dashboard)
  const [purchasesRows, setPurchasesRows] = useState([]); // entradas de estoque no período
  const [trend, setTrend] = useState({ revenue: null, orders: null, items: null, avgTicket: null });
  const cacheRef = useRef(new Map());

  const setPreset = (preset) => {
    const now = new Date();
    let from = new Date();
    switch (preset) {
      case 'today':
        from = new Date(now.toISOString().slice(0,10));
        break;
      case '7d':
        from.setDate(now.getDate() - 7);
        break;
      case '30d':
        from.setDate(now.getDate() - 30);
        break;
      case 'month':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        from.setDate(now.getDate() - 7);
    }
    setRangeFrom(from.toISOString().slice(0,10));
    setRangeTo(now.toISOString().slice(0,10));
  };

  const key = useMemo(()=>`${rangeFrom}:${rangeTo}`,[rangeFrom, rangeTo]);

  const loadDashboard = useCallback(async () => {
    if (!userId) return;
    if (options?.demo || userId === 'demo') {
      setLoading(true); setError('');
      try {
        const products = demoApi.listProducts();
        const salesAll = demoApi.listSales();
        const expensesAll = demoApi.listExpenses({ from: rangeFrom, to: rangeTo });
        const fromTs = new Date(rangeFrom).getTime();
        const toTs = new Date(`${rangeTo}T23:59:59.999Z`).getTime();
        const sales = salesAll.filter(s => {
          const d = new Date(s.sale_date || s.date || s.created_at);
          const t = d.getTime();
          return !Number.isNaN(t) && t >= fromTs && t <= toTs;
        });

        const revenue = sales.reduce((a, s) => a + Number(s.total_price ?? s.total ?? 0), 0);
        const orders = sales.length ? new Set(sales.map(s => String(s.sale_date || s.created_at || s.date || ''))).size : 0;
        const items = sales.reduce((a, s) => a + Number(s.quantity || s.items || 1), 0);
        const avgTicket = orders ? revenue / orders : 0;

        const byDay = {};
        sales.forEach(s => {
          const k = normDay(s.sale_date || s.date || s.created_at);
          if (!k) return;
          byDay[k] = (byDay[k] || { total: 0, items: 0 });
          byDay[k].total += Number(s.total_price ?? s.total ?? 0);
          byDay[k].items += Number(s.quantity || s.items || 1);
        });
        const days = dateIter(rangeFrom, rangeTo);
        const dailyRows = days.map(k => ({ day: k, total: byDay[k]?.total || 0, items: byDay[k]?.items || 0 }));

        const expByDay = {};
        expensesAll.forEach(e => {
          const k = String(e.date || '').slice(0, 10);
          expByDay[k] = (expByDay[k] || 0) + Number(e.amount || 0);
        });
        const cogsByDay = {};
        sales.forEach(s => {
          const k = normDay(s.sale_date || s.date || s.created_at);
          const cost = Number(s.cost_total || 0);
          cogsByDay[k] = (cogsByDay[k] || 0) + cost;
        });

        const financeRows = dailyRows.map(r => {
          const rev = Number(r.total || 0);
          const ex = Number(expByDay[r.day] || 0);
          const cg = Number(cogsByDay[r.day] || 0);
          return { day: r.day, revenue: rev, expenses: ex, profit: rev - cg - ex };
        });

        const cogs = sales.reduce((a, s) => a + Number(s.cost_total || 0), 0);
        const expenses = expensesAll.reduce((a, e) => a + Number(e.amount || 0), 0);
        const stockInvested = products.reduce((a, p) => a + Number(p.cost_price || 0) * Number(p.quantity || 0), 0);
        const stockPotential = products.reduce((a, p) => a + Number(p.sale_price || 0) * Number(p.quantity || 0), 0);
        const grossProfit = revenue - cogs;
        const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : null;
        const netProfit = revenue - cogs - expenses;

        const topMap = new Map();
        sales.forEach(s => {
          const pid = s.product_id || null;
          const k = String(pid || s.barcode || s.product_name || '');
          const prev = topMap.get(k) || { id: pid || k, name: s.product_name || 'Produto', barcode: s.barcode || '', qty: 0, revenue: 0, margin: null };
          prev.qty += Number(s.quantity || 1);
          prev.revenue += Number(s.total_price ?? s.total ?? 0);
          topMap.set(k, prev);
        });
        const topRows = Array.from(topMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
        const lowRows = products.filter(p => Number(p.quantity || 0) < 10).map(p => ({ id: p.id, name: p.name, barcode: p.barcode, quantity: p.quantity }));
        const recentRows = salesAll.slice(0, 10).map(r => ({
          id: r.id,
          date: r.sale_date || r.created_at || r.date,
          product: r.product_name || 'Produto',
          qty: Number(r.quantity || 1),
          total: Number(r.total_price ?? r.total ?? 0),
        }));

        const sum = {
          revenue,
          orders,
          items,
          avgTicket,
          products: products.length,
          lowStock: lowRows.length,
          stockValue: stockInvested,
          expenses,
          cogs,
          netProfit,
          stockInvested,
          stockPotential,
          grossMarginPct
        };

        setSummary(sum);
        setDaily(dailyRows);
        setFinanceDaily(financeRows);
        setTop(topRows);
        setLowStock(lowRows);
        setRecent(recentRows);
        setExpensesRows(expensesAll);
        setTrend({ revenue: null, orders: null, items: null, avgTicket: null });
        cacheRef.current.set(key, { summary: sum, daily: dailyRows, financeDaily: financeRows, top: topRows, lowStock: lowRows, recent: recentRows, expensesRows: expensesAll, trend: { revenue: null, orders: null, items: null, avgTicket: null } });
      } catch (e) {
        setError(e?.message || 'Falha ao carregar dados');
        showToast?.('Erro ao carregar dashboard', 'danger');
      } finally {
        setLoading(false);
      }
      return;
    }
    const cached = cacheRef.current.get(key);
    if (cached) {
      setSummary(cached.summary);
      setDaily(cached.daily);
      setFinanceDaily(cached.financeDaily || []);
      setTop(cached.top);
      setLowStock(cached.lowStock);
      setRecent(cached.recent);
      setExpensesRows(cached.expensesRows || []);
      return;
    }
    setLoading(true); setError('');
    try {
      // Summary
      const { data: sData, error: sErr } = await supabase.rpc('api_sales_summary', { from_date: rangeFrom, to_date: rangeTo, p_user_id: userId });
      if (sErr) throw sErr;
      // Daily
      const { data: dData, error: dErr } = await supabase.rpc('api_sales_daily', { from_date: rangeFrom, to_date: rangeTo, p_user_id: userId });
      if (dErr) throw dErr;
      // Top products
      const { data: tData, error: tErr } = await supabase.rpc('api_product_performance', { from_date: rangeFrom, to_date: rangeTo, p_user_id: userId });
      if (tErr) throw tErr;
      // Low stock
      const { data: lData, error: lErr } = await supabase.rpc('api_low_stock', { threshold: 10, p_user_id: userId });
      if (lErr) throw lErr;

      // Recent sales (last 10 globally)
      const { data: rData } = await supabase
        .from('sales')
        .select('id, sale_date, created_at, quantity, total_price, total, product_id, products(name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      const sRow = Array.isArray(sData) ? (sData[0] || {}) : (sData || {});
      const sum = {
        revenue: Number(sRow?.revenue || 0),
        orders: Number(sRow?.orders || 0),
        items: Number(sRow?.items || 0),
        avgTicket: Number(sRow?.avg_ticket || 0),
        products: Number(sRow?.products || 0),
        lowStock: Array.isArray(lData) ? lData.length : 0,
        stockValue: 'stock_value' in (sRow||{}) ? Number(sRow.stock_value) : null,
      };
      const dailyRows = Array.isArray(dData) ? dData.map(r => ({
        day: normDay(r.day || r.date || r.dia),
        total: Number(r.total || r.revenue || 0),
        items: Number(r.items || r.qty || 0),
      })) : [];
      const topRows = Array.isArray(tData) ? tData.map(r => ({
        id: r.product_id || r.id,
        name: r.name || r.product_name || 'Produto',
        barcode: r.barcode || '',
        qty: Number(r.items || r.qty || 0),
        revenue: Number(r.revenue || r.total || 0),
        margin: 'margin' in r ? Number(r.margin) : null,
      })) : [];
      const lowRows = Array.isArray(lData) ? lData.map(p => ({
        id: p.id, name: p.name, barcode: p.barcode, quantity: p.quantity
      })) : [];
      const recentRows = Array.isArray(rData) ? rData.map(r => ({
        id: r.id,
        date: r.sale_date || r.created_at,
        product: r.products?.name || 'Produto removido',
        qty: Number(r.quantity || 1),
        total: Number(r.total_price ?? r.total ?? 0),
      })) : [];

      const { data: prodsAll } = await supabase
        .from('products')
        .select('id,quantity,cost_price,sale_price')
        .eq('user_id', userId)
        .limit(5000);

      const { data: salesAll } = await supabase
        .from('sales')
        .select('sale_date,date,created_at,quantity,total_price,total,cost_total,product_id')
        .eq('user_id', userId)
        .limit(5000);

      let expData = [];
      try {
        const { data: eData } = await supabase
          .from('expenses')
          .select('amount,date,category,description')
          .eq('user_id', userId)
          .gte('date', rangeFrom)
          .lte('date', rangeTo)
          .limit(5000);
        if (Array.isArray(eData)) expData = eData;
      } catch {}
      setExpensesRows(expData);
      // Entradas (compras de mercadoria)
      let entData = [];
      try {
        const { data: mData } = await supabase
          .from('stock_movements')
          .select('product_id,quantity,cost_unit,occurred_at,created_at')
          .eq('user_id', userId)
          .eq('type', 'entrada')
          .order('created_at', { ascending: false })
          .limit(5000);
        if (Array.isArray(mData)) {
          const fromTs = new Date(rangeFrom).getTime();
          const toTs = new Date(`${rangeTo}T23:59:59.999Z`).getTime();
          entData = mData.filter(m => {
            const d = new Date(m.occurred_at || m.created_at);
            const t = d.getTime();
            return !Number.isNaN(t) && t >= fromTs && t <= toTs;
          });
        }
      } catch {}
      setPurchasesRows(entData);

      const productsAll = Array.isArray(prodsAll) ? prodsAll : [];
      const byId = new Map(productsAll.map(p => [String(p.id), p]));
      const fromTs = new Date(rangeFrom).getTime();
      const toTs = new Date(`${rangeTo}T23:59:59.999Z`).getTime();
      const srows = (Array.isArray(salesAll) ? salesAll : []).filter(s => {
        const d = new Date(s.sale_date || s.date || s.created_at);
        const t = d.getTime();
        return !Number.isNaN(t) && t >= fromTs && t <= toTs;
      });
      const cogs = srows.reduce((a, s) => {
        const qty = Number(s.quantity || s.items || 1);
        const cost = (s.cost_total != null) ? Number(s.cost_total || 0) : (Number(byId.get(String(s.product_id))?.cost_price || 0) * qty);
        return a + cost;
      }, 0);
      const expenses = expData.reduce((a, e) => a + Number(e.amount || 0), 0);
      const purchases = entData.reduce((a, m) => a + (Number(m.quantity || 0) * Number(m.cost_unit || 0)), 0);
      const stockInvested = productsAll.reduce((a, p) => a + Number(p.cost_price || 0) * Number(p.quantity || 0), 0);
      const stockPotential = productsAll.reduce((a, p) => a + Number(p.sale_price || 0) * Number(p.quantity || 0), 0);
      const grossProfit = sum.revenue - cogs;
      const grossMarginPct = sum.revenue > 0 ? (grossProfit / sum.revenue) * 100 : null;
      const netProfit = sum.revenue - cogs - expenses;

      sum.cogs = cogs;
      sum.expenses = expenses;
      sum.purchases = purchases;
      sum.netProfit = netProfit;
      sum.stockInvested = stockInvested;
      sum.stockPotential = stockPotential;
      sum.grossMarginPct = grossMarginPct;

      const revByDay = {};
      dailyRows.forEach(d => { revByDay[String(d.day)] = Number(d.total || 0); });
      const expByDay = {};
      expData.forEach(e => {
        const k = String(e.date || '').slice(0, 10);
        expByDay[k] = (expByDay[k] || 0) + Number(e.amount || 0);
      });
      const purchByDay = {};
      entData.forEach(m => {
        const k = normDay(m.occurred_at);
        purchByDay[k] = (purchByDay[k] || 0) + (Number(m.quantity || 0) * Number(m.cost_unit || 0));
      });
      const cogsByDay = {};
      srows.forEach(s => {
        const k = normDay(s.sale_date || s.date || s.created_at);
        const qty = Number(s.quantity || s.items || 1);
        const cost = (s.cost_total != null) ? Number(s.cost_total || 0) : (Number(byId.get(String(s.product_id))?.cost_price || 0) * qty);
        cogsByDay[k] = (cogsByDay[k] || 0) + cost;
      });
      const financeRows = dateIter(rangeFrom, rangeTo).map(k => {
        const rev = Number(revByDay[k] || 0);
        const ex = Number(expByDay[k] || 0);
        const cg = Number(cogsByDay[k] || 0);
        const purch = Number(purchByDay[k] || 0);
        return { day: k, revenue: rev, expenses: ex, purchases: purch, profit: rev - cg - ex };
      });

      // Previous period trend
      const fromDt = new Date(rangeFrom);
      const toDt = new Date(rangeTo);
      const diffDays = Math.max(1, Math.ceil((toDt - fromDt) / (1000*60*60*24)) + 1);
      const prevEnd = new Date(fromDt); prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - (diffDays - 1));
      const prevFrom = prevStart.toISOString().slice(0,10);
      const prevTo = prevEnd.toISOString().slice(0,10);
      let prevRow = {};
      try {
        const { data: pData } = await supabase.rpc('api_sales_summary', { from_date: prevFrom, to_date: prevTo, p_user_id: userId });
        prevRow = Array.isArray(pData) ? (pData[0] || {}) : (pData || {});
      } catch {}
      const prev = {
        revenue: Number(prevRow?.revenue || 0),
        orders: Number(prevRow?.orders || 0),
        items: Number(prevRow?.items || 0),
        avgTicket: Number(prevRow?.avg_ticket || 0)
      };
      const pct = (now, old) => {
        const base = old > 0 ? old : (now > 0 ? now : 1);
        return ((now - old) / base) * 100;
      };
      const t = {
        revenue: pct(Number(sRow?.revenue || 0), prev.revenue),
        orders: pct(Number(sRow?.orders || 0), prev.orders),
        items: pct(Number(sRow?.items || 0), prev.items),
        avgTicket: pct(Number(sRow?.avg_ticket || 0), prev.avgTicket),
      };

      setSummary(sum);
      setDaily(dailyRows);
      setFinanceDaily(financeRows);
      setTop(topRows);
      setLowStock(lowRows);
      setRecent(recentRows);
      setTrend(t);
      cacheRef.current.set(key, { summary: sum, daily: dailyRows, financeDaily: financeRows, top: topRows, lowStock: lowRows, recent: recentRows, expensesRows: expData, trend: t });
    } catch (e) {
      const msg = e?.message || '';
      const code = String(e?.code || '');
      const isNotFound = msg.includes('404') || msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('does not exist');
      const isSchemaMismatch = code === '400' || msg.toLowerCase().includes('schema') || msg.toLowerCase().includes('column') || msg.toLowerCase().includes('bad request');
      if (isNotFound || isSchemaMismatch) {
        // Fallback: agrega via tabelas existentes sem RPCs
        try {
          const { data: prods } = await supabase
            .from('products')
            .select('id,name,barcode,quantity,cost_price,sale_price')
            .eq('user_id', userId)
            .limit(5000);
          // Busca vendas do usuário e filtra período em memória para aceitar date ou sale_date
          const { data: sales } = await supabase
            .from('sales')
            .select('*')
            .eq('user_id', userId)
            .limit(5000);
          const products = Array.isArray(prods) ? prods : [];
          // Filtra por período usando sale_date || date || created_at
          const fromTs = new Date(rangeFrom).getTime();
          const toTs = new Date(`${rangeTo}T23:59:59.999Z`).getTime();
          const allSales = Array.isArray(sales) ? sales : [];
          const srows = allSales.filter(s => {
            const d = new Date(s.sale_date || s.date || s.created_at);
            const t = d.getTime();
            return !Number.isNaN(t) && t >= fromTs && t <= toTs;
          });
          const revenue = srows.reduce((a,b)=>a+Number((b.total_price ?? b.total) || 0),0);
          const orders = srows.length;
          const items = srows.reduce((a,b)=>a+Number(b.quantity||b.items||1),0);
          const avgTicket = orders ? revenue/orders : 0;
          const stockValue = products.reduce((a,p)=>a + Number(p.cost_price||0)*Number(p.quantity||0), 0);
          const stockPotential = products.reduce((a,p)=>a + Number(p.sale_price||0)*Number(p.quantity||0), 0);
          const lowRows = products.filter(p=>Number(p.quantity||0) < 10);
          let expRows = [];
          try {
            const { data: eData2 } = await supabase
              .from('expenses')
              .select('amount,date')
              .eq('user_id', userId)
              .gte('date', rangeFrom)
              .lte('date', rangeTo)
              .limit(5000);
            if (Array.isArray(eData2)) expRows = eData2;
          } catch {}
          const expenses = expRows.reduce((a,e)=>a+Number(e.amount||0),0);
          setExpensesRows(expRows);
          const cogs = srows.reduce((a,s)=>{
            const qty = Number(s.quantity||s.items||1);
            const cost = (s.cost_total != null) ? Number(s.cost_total||0) : (Number(products.find(p=>String(p.id)===String(s.product_id))?.cost_price||0) * qty);
            return a + cost;
          },0);
          const grossProfit = revenue - cogs;
          const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : null;
          const netProfit = revenue - cogs - expenses;
          const byDay = {};
          srows.forEach(s=>{
            const k = new Date(s.sale_date || s.date || s.created_at).toISOString().slice(0,10);
            byDay[k] = (byDay[k]||{ total:0, items:0 });
            byDay[k].total += Number((s.total_price ?? s.total) || 0);
            byDay[k].items += Number(s.quantity||s.items||1);
          });
          const dailyRows = [];
          const start = new Date(rangeFrom); const end = new Date(rangeTo);
          for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
            const k = d.toISOString().slice(0,10);
            dailyRows.push({ day:k, total: byDay[k]?.total||0, items: byDay[k]?.items||0 });
          }
          const expByDay = {};
          expRows.forEach(e=>{ const k = String(e.date||'').slice(0,10); expByDay[k] = (expByDay[k]||0) + Number(e.amount||0); });
          const cogsByDay = {};
          srows.forEach(s=>{
            const k = new Date(s.sale_date || s.date || s.created_at).toISOString().slice(0,10);
            const qty = Number(s.quantity||s.items||1);
            const cost = (s.cost_total != null) ? Number(s.cost_total||0) : (Number(products.find(p=>String(p.id)===String(s.product_id))?.cost_price||0) * qty);
            cogsByDay[k] = (cogsByDay[k]||0) + cost;
          });
          const financeRows = dailyRows.map(r=>{
            const rev = Number(r.total||0);
            const ex = Number(expByDay[r.day]||0);
            const cg = Number(cogsByDay[r.day]||0);
            return { day: r.day, revenue: rev, expenses: ex, profit: rev - cg - ex };
          });
          const topMap = new Map();
          srows.forEach(s=>{
            const pid = s.product_id || null;
            if (!pid) return;
            const keyp = String(pid);
            const prev = topMap.get(keyp) || { id: pid, name: '', barcode:'', qty:0, revenue:0, margin:null };
            prev.qty += Number(s.quantity||s.items||1);
            prev.revenue += Number((s.total_price ?? s.total) || 0);
            topMap.set(keyp, prev);
          });
          const topRows = Array.from(topMap.values()).map(r=>{
            const p = products.find(px => String(px.id) === String(r.id)) || {};
            return { ...r, name: p.name || r.name || 'Produto', barcode: p.barcode || r.barcode || '' };
          });
          const recentRows = [...allSales]
            .sort((a,b)=> new Date(b.created_at) - new Date(a.created_at))
            .slice(0,10)
            .map(r=>({
              id: r.id,
              date: r.sale_date || r.created_at || r.date,
              product: (products.find(px=>String(px.id)===String(r.product_id))?.name) || r.product_name || 'Produto',
              qty: Number(r.quantity || 1),
              total: Number(r.total_price ?? r.total ?? 0),
            }));
          const sum = {
            revenue,
            orders,
            items,
            avgTicket,
            products: products.length,
            lowStock: lowRows.length,
            stockValue,
            expenses,
            cogs,
            netProfit,
            stockInvested: stockValue,
            stockPotential,
            grossMarginPct
          };
          setSummary(sum); setDaily(dailyRows); setFinanceDaily(financeRows); setTop(topRows); setLowStock(lowRows); setRecent(recentRows); setTrend({ revenue:null, orders:null, items:null, avgTicket:null });
          cacheRef.current.set(key, { summary: sum, daily: dailyRows, financeDaily: financeRows, top: topRows, lowStock: lowRows, recent: recentRows, expensesRows: expRows, trend: { revenue:null, orders:null, items:null, avgTicket:null } });
        } catch (fe) {
          setError(fe?.message || 'Falha ao carregar dados');
          showToast?.('Erro ao carregar dashboard', 'danger');
        }
      } else {
        setError(msg || 'Falha ao carregar dados');
        showToast?.('Erro ao carregar dashboard', 'danger');
      }
    } finally {
      setLoading(false);
    }
  }, [userId, supabase, rangeFrom, rangeTo, key, showToast, options?.demo]);

  useEffect(()=>{ loadDashboard(); }, [loadDashboard]);

  // Exports
  const exportCsv = (type) => {
    const buildCsv = (rows, headers) => [headers.join(';'), ...rows.map(r=>r.join(';'))].join('\n');
    let filename = 'relatorio.csv'; let csv = '';
    if (type === 'vendas') {
      filename = `vendas_${rangeFrom}_${rangeTo}.csv`;
      csv = buildCsv(daily.map(r=>[r.day, String(r.total).replace('.',','), r.items]), ['dia','receita','itens']);
    } else if (type === 'top') {
      filename = `top_produtos_${rangeFrom}_${rangeTo}.csv`;
      csv = buildCsv(top.map(r=>[r.name, r.barcode, r.qty, String(r.revenue).replace('.',',')]), ['produto','codigo','qtd','receita']);
    } else if (type === 'low') {
      filename = `estoque_baixo_${rangeFrom}.csv`;
      csv = buildCsv(lowStock.map(r=>[r.name, r.barcode, r.quantity]), ['produto','codigo','qtd']);
    } else if (type === 'despesas') {
      filename = `despesas_${rangeFrom}_${rangeTo}.csv`;
      csv = buildCsv(expensesRows.map(r=>[String(r.date).slice(0,10), r.description || '', r.category || '', String(r.amount || 0).replace('.',',')]), ['data','descricao','categoria','valor']);
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  };

  return {
    // state
    rangeFrom, rangeTo, setRangeFrom, setRangeTo, setPreset,
    loading, error,
    summary, daily, financeDaily, top, lowStock, recent, expensesRows, purchasesRows, trend,
    // actions
    loadDashboard, exportCsv,
  };
}
