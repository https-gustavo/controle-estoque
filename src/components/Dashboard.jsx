import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import SalesHistory from './SalesHistory';
import DashboardSidebar from './dashboard/DashboardSidebar';
import DashboardHeader from './dashboard/DashboardHeader';
import ApiPanel from './dashboard/ApiPanel';
import ProductsPanel from './dashboard/ProductsPanel';
import { QuantityModal, PriceModal, ConfirmSaleModal } from './dashboard/Modals';
import StockEntryPanel from './dashboard/StockEntryPanel';
import SalesPanel from './dashboard/SalesPanel';
import ExpensesPanel from './dashboard/ExpensesPanel';
import SettingsPanel from './dashboard/SettingsPanel';
import DashboardPanel from './dashboard/DashboardPanel';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { demoApi } from '../demo/demoApi';
import { printReceipt } from '../utils/printReceipt';
import '../styles/Dashboard.css';

export default function Dashboard({ setUser, demo, onExitDemo }) {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    try { return localStorage.getItem('activeTab') || 'dashboard'; } catch { return 'dashboard'; }
  }); // dashboard | produtos | entrada | vendas | historico | api | custos
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [companySettings, setCompanySettings] = useState({ name: 'Tech Estoque', logo: '' });

  // Produtos
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ minPrice: '', maxPrice: '', minStock: '', maxStock: '', stockStatus: '' });
  const [form, setForm] = useState({ name: '', barcode: '', quantity: '', cost_price: '', sale_price: '' });

  // Modais auxiliares
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [editCostPrice, setEditCostPrice] = useState('');
  const [editSalePrice, setEditSalePrice] = useState('');

  // Vendas
  const [saleSearch, setSaleSearch] = useState('');
  const [saleSuggestions, setSaleSuggestions] = useState([]);
  const [saleSuggestionIndex, setSaleSuggestionIndex] = useState(-1);
  const [salesCart, setSalesCart] = useState([]);
  const [saleDiscount, setSaleDiscount] = useState('');

  const formatCurrency = (v)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const handleQuickSaleSearchChange = (value) => {
    setSaleSearch(value);
    const q = value.trim().toLowerCase();
    if (!q) { setSaleSuggestions([]); return; }
    const matches = products.filter(p => String(p.name||'').toLowerCase().includes(q) || String(p.barcode||'').includes(q)).slice(0, 8);
    setSaleSuggestions(matches);
    setSaleSuggestionIndex(matches.length ? 0 : -1);
  };
  const addProductToCart = (prod, qty=1) => {
    const id = prod.id || prod.product_id || prod.barcode || Math.random().toString(16).slice(2);
    setSalesCart(prev => {
      const found = prev.find(i => i.id === id);
      if (found) return prev.map(i => i.id===id ? { ...i, quantity: i.quantity + qty } : i);
      return [...prev, { id, name: prod.name || prod.product_name || 'Produto', barcode: prod.barcode || '', unit_price: Number(prod.sale_price||0), quantity: qty }];
    });
    setSaleSearch('');
    setSaleSuggestions([]);
    setSaleSuggestionIndex(-1);
  };
  const handleAddBySearch = () => {
    if (saleSuggestions.length > 0) addProductToCart(saleSuggestions[0], 1);
  };
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAddBySearch(); }
    if (e.key === 'ArrowDown') setSaleSuggestionIndex(i => Math.min(i+1, saleSuggestions.length-1));
    if (e.key === 'ArrowUp') setSaleSuggestionIndex(i => Math.max(i-1, 0));
  };
  const decCartQty = (id) => setSalesCart(prev => prev.map(i => i.id===id ? { ...i, quantity: Math.max(1, i.quantity-1)} : i));
  const incCartQty = (id) => setSalesCart(prev => prev.map(i => i.id===id ? { ...i, quantity: i.quantity+1} : i));
  const updateCartQty = (id, v) => setSalesCart(prev => prev.map(i => i.id===id ? { ...i, quantity: Math.max(1, parseInt(v||'1',10)||1)} : i));
  const removeFromCart = (id) => setSalesCart(prev => prev.filter(i => i.id !== id));
  const cartSubtotal = salesCart.reduce((a,b)=>a + Number(b.unit_price||0)*Number(b.quantity||0), 0);
  const discountValue = Math.min(Number(saleDiscount||0), cartSubtotal);
  const cartTotal = Math.max(0, cartSubtotal - discountValue);
  const [showConfirmSale, setShowConfirmSale] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [printAfterSale, setPrintAfterSale] = useState(true);
  const handleFinalizeSale = () => {
    if (salesCart.length === 0) return;
    setShowConfirmSale(true);
  };
  const persistSale = async () => {
    if (!userId || salesCart.length === 0) { setShowConfirmSale(false); return; }
    if (isDemo) {
      setConfirmBusy(true);
      try {
        demoApi.recordSale({ items: salesCart, discountValue });
        setSalesCart([]); setSaleDiscount('');
        fetchProducts('demo');
        showToast('Venda registrada (demo)', 'success');
        try { window.dispatchEvent(new Event('dashboard:refresh')); } catch {}
        if (printAfterSale) {
          const rows = salesCart.map(i=>({ name:i.name, barcode:i.barcode||'', qty:Number(i.quantity||1), unit:Number(i.unit_price||0), total:Number(i.unit_price||0)*Number(i.quantity||1) }));
          printReceipt({ companyName: companySettings?.name || 'Tech Estoque', title: 'Comprovante de venda', code: null, date: new Date(), items: rows, subtotal: Number(cartSubtotal||0), discount: Number(discountValue||0), total: Number(cartTotal||0) });
        }
      } catch {
        showToast('Falha ao registrar venda (demo)', 'danger');
      } finally {
        setConfirmBusy(false);
        setShowConfirmSale(false);
      }
      return;
    }
    for (const item of salesCart) {
      const p = products.find(pr => String(pr.id) === String(item.id) || (item.barcode && pr.barcode === item.barcode));
      const cost = Number(p?.cost_price || 0);
      if (!(cost > 0)) {
        showToast('Produto sem custo. Atualize o custo antes de registrar a venda.', 'danger');
        setShowConfirmSale(false);
        return;
      }
    }
    setConfirmBusy(true);
    try {
      const now = new Date().toISOString();
      // monta linhas: 1 linha por item (duas variações de schema)
      const rowsMinimal = salesCart.map(item => {
        const p = products.find(pr => String(pr.id) === String(item.id) || (item.barcode && pr.barcode === item.barcode));
        return {
          user_id: userId,
          product_id: p?.id ?? null,
          date: now,
          total: Number(item.unit_price || 0) * Number(item.quantity || 1)
        };
      });
      const rowsDetailed = salesCart.map(item => {
        // tenta resolver id do produto pelo estado atual
        const p = products.find(pr => String(pr.id) === String(item.id) || (item.barcode && pr.barcode === item.barcode));
        const qty = Number(item.quantity || 1);
        const unit = Number(item.unit_price || 0);
        const revenue = unit * qty;
        const costUnit = Number(p?.cost_price || 0);
        const costTotal = costUnit * qty;
        return {
          user_id: userId,
          product_id: p?.id ?? null,
          product_name: item.name,
          barcode: item.barcode || p?.barcode || null,
          quantity: qty,
          unit_price: unit,
          total_price: revenue,
          cost_total: costTotal,
          profit: revenue - costTotal,
          sale_date: now
        };
      });
      // Agora que as colunas modernas existem, tenta primeiro (sale_date/total_price/...),
      // e se falhar, cai no legado (date/total).
      let insErr = null;
      let ins1 = await supabase.from('sales').insert(rowsDetailed);
      if (ins1.error && (String(ins1.error.message || '').toLowerCase().includes('cost_total') || String(ins1.error.message || '').toLowerCase().includes('profit'))) {
        const stripped = rowsDetailed.map(({ cost_total, profit, ...rest }) => rest);
        ins1 = await supabase.from('sales').insert(stripped);
      }
      if (ins1.error) {
        insErr = ins1.error;
        const ins2 = await supabase.from('sales').insert(rowsMinimal);
        if (ins2.error) throw ins2.error;
        insErr = null;
      }
      if (insErr) throw insErr;
      const saveOutMovement = async ({ product_id, quantity, cost_unit }) => {
        try {
          const modern = { user_id: userId, product_id, type: 'saida', quantity, cost_unit, occurred_at: now };
          const legacy = { user_id: userId, product_id, type: 'saida', quantity };
          let { error } = await supabase.from('stock_movements').insert([modern]);
          if (error) ({ error } = await supabase.from('stock_movements').insert([legacy]));
          if (error) return;
        } catch {}
      };
      // atualiza estoque
      for (const item of salesCart) {
        const p = products.find(pr => String(pr.id) === String(item.id) || (item.barcode && pr.barcode === item.barcode));
        if (!p?.id) continue;
        const newQty = Math.max(0, Number(p.quantity||0) - Number(item.quantity||0));
        const { error: upErr } = await supabase.from('products').update({ quantity: newQty }).eq('id', p.id).eq('user_id', userId);
        if (upErr) throw upErr;
        await saveOutMovement({ product_id: p.id, quantity: Number(item.quantity||0), cost_unit: Number(p.cost_price||0) });
      }
      // refresh local
      await fetchProducts(userId);
      setSalesCart([]); setSaleDiscount('');
      showToast('Venda registrada com sucesso', 'success');
      try { window.dispatchEvent(new Event('dashboard:refresh')); } catch {}
      if (printAfterSale) {
        const rows = salesCart.map(i=>({ name:i.name, barcode:i.barcode||'', qty:Number(i.quantity||1), unit:Number(i.unit_price||0), total:Number(i.unit_price||0)*Number(i.quantity||1) }));
        printReceipt({ companyName: companySettings?.name || 'Tech Estoque', title: 'Comprovante de venda', code: null, date: new Date(), items: rows, subtotal: Number(cartSubtotal||0), discount: Number(discountValue||0), total: Number(cartTotal||0) });
      }
    } catch (e) {
      showToast(e?.message || 'Falha ao registrar venda', 'danger');
    } finally {
      setConfirmBusy(false);
      setShowConfirmSale(false);
    }
  };

  const showToast = (message, type = 'success', ms = 2500) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), ms);
  };

  const isDemo = Boolean(demo) || userId === 'demo';

  useBarcodeScanner((code, e) => {
    const barcode = String(code || '').trim();
    if (!barcode) return;
    const found = products.find(p => String(p.barcode || '') === barcode);

    if (activeTab === 'vendas') {
      if (found) {
        addProductToCart(found, 1);
        showToast('Produto identificado', 'success');
        e?.preventDefault?.();
        e?.stopPropagation?.();
      } else {
        showToast('Produto não encontrado', 'danger');
      }
      return;
    }

    if (activeTab === 'entrada') {
      window.dispatchEvent(new CustomEvent('scanner:code', { detail: { code: barcode, tab: 'entrada' } }));
      e?.preventDefault?.();
      e?.stopPropagation?.();
      return;
    }
  });

  const filteredProducts = useMemo(() => {
    let arr = products;
    const q = search.trim().toLowerCase();
    if (q) arr = arr.filter(p => String(p.name || '').toLowerCase().includes(q) || String(p.barcode || '').toLowerCase().includes(q));
    if (filters.minPrice) arr = arr.filter(p => Number(p.sale_price || 0) >= Number(filters.minPrice));
    if (filters.maxPrice) arr = arr.filter(p => Number(p.sale_price || 0) <= Number(filters.maxPrice));
    if (filters.minStock) arr = arr.filter(p => Number(p.quantity || 0) >= Number(filters.minStock));
    if (filters.maxStock) arr = arr.filter(p => Number(p.quantity || 0) <= Number(filters.maxStock));
    if (filters.stockStatus === 'low') arr = arr.filter(p => Number(p.quantity || 0) > 0 && Number(p.quantity || 0) < 10);
    if (filters.stockStatus === 'normal') arr = arr.filter(p => Number(p.quantity || 0) >= 10);
    if (filters.stockStatus === 'none') arr = arr.filter(p => Number(p.quantity || 0) <= 0);
    return arr;
  }, [products, search, filters]);

  useEffect(() => {
    let cancelled = false;
    if (demo) {
      setUserId('demo');
      fetchProducts('demo');
      return () => { cancelled = true; };
    }
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      const uid = session?.user?.id || null;
      setUserId(uid);
      fetchProducts(uid);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUserId(session?.user?.id || null);
      if (!session?.user?.id) navigate('/', { replace: true });
    });
    return () => {
      sub?.subscription?.unsubscribe?.();
      cancelled = true;
    };
  }, []);

  const fetchProducts = async (uid = userId) => {
    if (!uid) return;
    if (uid === 'demo') {
      setProducts(demoApi.listProducts());
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || 'Falha ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const clearForm = () => setForm({ name: '', barcode: '', quantity: '', cost_price: '', sale_price: '' });

  const handleCreate = async () => {
    if (!userId) return;
    const name = form.name.trim();
    const barcode = form.barcode.trim();
    const quantity = parseInt(form.quantity || '0', 10) || 0;
    const cost_price = parseFloat(String(form.cost_price || '0').replace(',', '.')) || 0;
    const sale_price = parseFloat(String(form.sale_price || '0').replace(',', '.')) || 0;
    if (!name) { setError('Informe um nome'); return; }
    setLoading(true);
    setError('');
    try {
      if (isDemo) {
        demoApi.createProduct({ name, barcode, quantity, cost_price, sale_price });
      } else {
        const { error } = await supabase
          .from('products')
          .insert([{ user_id: userId, name, barcode, quantity, cost_price, sale_price }]);
        if (error) throw error;
      }
      clearForm();
      fetchProducts();
      showToast('Produto criado');
    } catch (e) {
      setError(e?.message || 'Falha ao criar produto');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!userId || !id) return;
    if (!window.confirm('Excluir este produto?')) return;
    setLoading(true);
    setError('');
    try {
      if (isDemo) {
        demoApi.deleteProduct(id);
      } else {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);
        if (error) throw error;
      }
      setProducts(prev => prev.filter(p => p.id !== id));
      showToast('Produto excluído', 'success');
    } catch (e) {
      setError(e?.message || 'Falha ao excluir');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProduct = async (id, patch) => {
    if (!userId || !id) return;
    setLoading(true);
    setError('');
    try {
      const clean = {
        name: String(patch.name || '').trim(),
        barcode: String(patch.barcode || '').trim(),
        category: String(patch.category || '').trim(),
        cost_price: Number(patch.cost_price || 0),
        sale_price: Number(patch.sale_price || 0)
      };
      if (isDemo) {
        demoApi.updateProduct(id, clean);
      } else {
        const tryUpdate = async (payload) => supabase.from('products').update(payload).eq('id', id).eq('user_id', userId);
        let { error } = await tryUpdate(clean);
        if (error && String(error.message || '').toLowerCase().includes('category')) {
          const { category, ...rest } = clean;
          ({ error } = await tryUpdate(rest));
        }
        if (error) throw error;
      }
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...clean } : p));
      showToast('Produto atualizado', 'success');
    } catch (e) {
      setError(e?.message || 'Falha ao atualizar produto');
      showToast('Erro ao atualizar produto', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const createOne = async (payload, { silent } = {}) => {
      const name = String(payload?.name||'').trim();
      const barcode = String(payload?.barcode||'').trim();
      const cost_price = Number(payload?.cost_price||0);
      const sale_price = Number(payload?.sale_price||0);
      const category = String(payload?.category||'').trim();
      const margin = Number(payload?.margin||0);
      const quantity = parseInt(String(payload?.quantity ?? '0'), 10) || 0;
      if (!name) { if (!silent) showToast('Informe nome do produto', 'danger'); return { ok: false, reason: 'name' }; }

      const existing = products.find(p => (barcode && String(p.barcode||'')===barcode) || String(p.name||'').toLowerCase()===name.toLowerCase());
      if (existing) {
        if (!silent) {
          showToast('Produto já existe. Use a tela Entrada para ajustar estoque.', 'danger');
          handleTabChange('entrada');
        }
        return { ok: false, reason: 'exists' };
      }

      const row = { user_id: userId, name, barcode, quantity: Math.max(0, quantity), cost_price, sale_price };
      if (category) row.category = category;
      if (margin) row.margin = margin;

      if (isDemo) {
        demoApi.createProduct(row);
        return { ok: true };
      }

      const tryInsert = async (payload) => supabase.from('products').insert([payload]);
      let { error } = await tryInsert(row);
      if (error && (String(error.message || '').toLowerCase().includes('category') || String(error.message || '').toLowerCase().includes('margin'))) {
        const { category, margin, ...rest } = row;
        ({ error } = await tryInsert(rest));
      }
      if (error) throw error;
      return { ok: true };
    };

    const onAdd = async (evt) => {
      if (!userId) return;
      setLoading(true);
      setError('');
      try {
        await createOne(evt.detail || {});
        await fetchProducts(isDemo ? 'demo' : userId);
        showToast('Produto criado', 'success');
      } catch (e) {
        setError(e?.message || 'Falha ao salvar produto');
      } finally {
        setLoading(false);
      }
    };

    const onAddMany = async (evt) => {
      if (!userId) return;
      const arr = Array.isArray(evt?.detail?.items) ? evt.detail.items : [];
      if (!arr.length) return;
      setLoading(true);
      setError('');
      try {
        let ok = 0;
        let skipped = 0;
        for (const it of arr) {
          const res = await createOne(it, { silent: true });
          if (res.ok) ok += 1; else skipped += 1;
        }
        await fetchProducts(isDemo ? 'demo' : userId);
        if (ok > 0 && skipped === 0) showToast(`${ok} produtos criados`, 'success');
        else if (ok > 0 && skipped > 0) showToast(`${ok} criados, ${skipped} ignorados`, 'success');
        else showToast('Nenhum produto criado', 'danger');
      } catch (e) {
        setError(e?.message || 'Falha ao salvar produtos');
        showToast('Erro ao criar produtos', 'danger');
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener('products:add', onAdd);
    window.addEventListener('products:addMany', onAddMany);
    return () => {
      window.removeEventListener('products:add', onAdd);
      window.removeEventListener('products:addMany', onAddMany);
    };
  }, [userId, products, isDemo]);

  const handleLogout = async () => {
    if (isDemo) {
      await onExitDemo?.();
      navigate('/', { replace: true });
      return;
    }
    try { await supabase.auth.signOut(); } finally { setUser?.(null); navigate('/', { replace: true }); }
  };

  // Navegação/Sidebar
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    try { localStorage.setItem('activeTab', tab); } catch {}
  };
  const toggleSidebar = () => setSidebarOpen(v => !v);
  const closeSidebar = () => setSidebarOpen(false);
  const handleMobileNavClick = () => {
    // fecha o menu em telas pequenas após clicar
    if (typeof window !== 'undefined' && window.innerWidth < 1024) setSidebarOpen(false);
  };
  const handleLogoFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setCompanySettings(prev => ({ ...prev, logo: reader.result }));
    reader.readAsDataURL(f);
  };
  const saveCompanySettings = () => showToast('Configurações salvas');

  const goStockEntry = () => handleTabChange('entrada');

  const handleUpdateQuantity = async () => {
    if (!selectedProduct || !userId) return;
    const quantity = parseInt(customValue || '0', 10);
    if (Number.isNaN(quantity) || quantity < 0) { showToast('Quantidade inválida', 'danger'); return; }
    setLoading(true);
    try {
      if (isDemo) {
        demoApi.updateProduct(selectedProduct.id, { quantity });
      } else {
        const { error } = await supabase.from('products').update({ quantity }).eq('id', selectedProduct.id).eq('user_id', userId);
        if (error) throw error;
      }
      setProducts(prev => prev.map(p => p.id === selectedProduct.id ? { ...p, quantity } : p));
      setShowQuantityModal(false);
      setSelectedProduct(null);
      setCustomValue('');
      showToast('Quantidade atualizada');
    } catch (e) {
      showToast('Erro ao atualizar', 'danger');
    } finally { setLoading(false); }
  };

  const handleUpdatePrices = async () => {
    if (!selectedProduct || !userId) return;
    const patch = {};
    if (editCostPrice !== '') patch.cost_price = Number(String(editCostPrice).replace(',', '.'));
    if (editSalePrice !== '') patch.sale_price = Number(String(editSalePrice).replace(',', '.'));
    setLoading(true);
    try {
      if (isDemo) {
        demoApi.updateProduct(selectedProduct.id, patch);
      } else {
        const { error } = await supabase.from('products').update(patch).eq('id', selectedProduct.id).eq('user_id', userId);
        if (error) throw error;
      }
      setProducts(prev => prev.map(p => p.id === selectedProduct.id ? { ...p, ...patch } : p));
      setShowPriceModal(false);
      setSelectedProduct(null);
      setEditCostPrice('');
      setEditSalePrice('');
      showToast('Preços atualizados');
    } catch { showToast('Erro ao atualizar preços', 'danger'); }
    finally { setLoading(false); }
  };

  return (
    <>
      <div className="dashboard-container">
        <div className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} onClick={closeSidebar}></div>
        <DashboardSidebar
          activeTab={activeTab}
          onChange={handleTabChange}
          onLogout={handleLogout}
          sidebarOpen={sidebarOpen}
          companySettings={companySettings}
          onMobileClick={handleMobileNavClick}
        />

        <div className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <DashboardHeader sidebarOpen={sidebarOpen} onToggle={toggleSidebar} />

          {isDemo && (
            <div className="card" style={{ margin: '0 0 14px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800 }}>Modo demonstração</div>
                <div className="helper-text">Alterações não afetam dados reais e ficam apenas no navegador.</div>
              </div>
              <button className="btn-outline" onClick={handleLogout}>Sair do demo</button>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <DashboardPanel
              userId={userId}
              demo={isDemo}
              formatCurrency={formatCurrency}
              showToast={showToast}
              onNavigate={(tab)=>handleTabChange(tab)}
              onAdjustQuantity={(product)=>{ setSelectedProduct(product); setShowQuantityModal(true); setCustomValue(String(product?.quantity || '')); }}
              onEntry={goStockEntry}
            />
          )}

          {activeTab === 'produtos' && (
            <ProductsPanel
              search={search}
              setSearch={setSearch}
              filters={filters}
              setFilters={setFilters}
              products={products}
              loading={loading}
              filteredProducts={filteredProducts}
              handleDelete={handleDelete}
              onGoEntry={goStockEntry}
              onUpdate={handleUpdateProduct}
            />
          )}

          {activeTab === 'entrada' && (
            <StockEntryPanel
              userId={userId}
              demo={isDemo}
              products={products}
              onRefreshProducts={()=>fetchProducts(userId)}
              showToast={showToast}
            />
          )}

          {activeTab === 'vendas' && (
            <SalesPanel
              saleSearch={saleSearch}
              saleSuggestions={saleSuggestions}
              saleSuggestionIndex={saleSuggestionIndex}
              handleQuickSaleSearchChange={handleQuickSaleSearchChange}
              handleSearchKeyDown={handleSearchKeyDown}
              handleAddBySearch={handleAddBySearch}
              renderHighlighted={(text,q)=>text}
              addProductToCart={addProductToCart}
              salesCart={salesCart}
              formatCurrency={formatCurrency}
              decCartQty={decCartQty}
              incCartQty={incCartQty}
              updateCartQty={updateCartQty}
              removeFromCart={removeFromCart}
              saleDiscount={saleDiscount}
              setSaleDiscount={setSaleDiscount}
              cartSubtotal={cartSubtotal}
              discountValue={discountValue}
              cartTotal={cartTotal}
              handleFinalizeSale={handleFinalizeSale}
            />
          )}

          {activeTab === 'historico' && (
            <SalesHistory demo={isDemo} userId={userId} showToast={showToast} formatCurrency={(v)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} />
          )}

          {activeTab === 'api' && <ApiPanel />}

          {activeTab === 'custos' && (
            <ExpensesPanel demo={isDemo} userId={userId} formatCurrency={formatCurrency} showToast={showToast} />
          )}

          {activeTab === 'configuracoes' && (
            <SettingsPanel
              companySettings={companySettings}
              setCompanySettings={v=>setCompanySettings(v)}
              onLogoFileChange={handleLogoFileChange}
              onSaveCompanySettings={saveCompanySettings}
            />
          )}
        </div>

        {toast && (
          <div className={`toast ${toast.type}`} role="status" aria-live="polite" aria-atomic="true">{toast.message}</div>
        )}

        <QuantityModal
          open={showQuantityModal}
          selectedProduct={selectedProduct}
          value={customValue}
          onChange={setCustomValue}
          onClose={()=>setShowQuantityModal(false)}
          onSubmit={handleUpdateQuantity}
          loading={loading}
        />

        <PriceModal
          open={showPriceModal}
          selectedProduct={selectedProduct}
          costValue={editCostPrice}
          saleValue={editSalePrice}
          setCostValue={setEditCostPrice}
          setSaleValue={setEditSalePrice}
          onClose={()=>setShowPriceModal(false)}
          onSubmit={handleUpdatePrices}
          loading={loading}
        />
        <ConfirmSaleModal
          open={showConfirmSale}
          items={salesCart}
          subtotal={cartSubtotal}
          discount={discountValue}
          total={cartTotal}
          formatCurrency={formatCurrency}
          printAfter={printAfterSale}
          setPrintAfter={setPrintAfterSale}
          onClose={()=>setShowConfirmSale(false)}
          onConfirm={persistSale}
          busy={confirmBusy}
        />

        <footer className="app-footer">
          <div className="footer-content">
            <p className="copyright">
              © 2025 <strong><a href="https://github.com/https-gustavo" target="_blank" rel="noopener noreferrer">Gustavo Menezes</a></strong> - Projeto Integrador Univesp
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}

