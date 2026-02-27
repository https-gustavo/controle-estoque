import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import SalesHistory from './SalesHistory';
import DashboardSidebar from './dashboard/DashboardSidebar';
import DashboardHeader from './dashboard/DashboardHeader';
import ApiPanel from './dashboard/ApiPanel';
import ProductsPanel from './dashboard/ProductsPanel';
import { EntryModal, QuantityModal, PriceModal } from './dashboard/Modals';
import SalesPanel from './dashboard/SalesPanel';
import CostsPanel from './dashboard/CostsPanel';
import SettingsPanel from './dashboard/SettingsPanel';
import '../styles/Dashboard.css';

export default function Dashboard({ setUser }) {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    try { return localStorage.getItem('activeTab') || 'dashboard'; } catch { return 'dashboard'; }
  }); // dashboard | produtos | vendas | historico | api | custos
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [companySettings] = useState({ name: 'Estoque Pro', logo: '' });

  // Produtos
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ minPrice: '', maxPrice: '', minStock: '', maxStock: '', stockStatus: '' });
  const [form, setForm] = useState({ name: '', barcode: '', quantity: '', cost_price: '', sale_price: '' });

  // Modal de Entrada (simples/avançado)
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [simpleMode, setSimpleMode] = useState(true);
  const [quickEntry, setQuickEntry] = useState({ barcode: '', name: '', quantity: '', cost_price: '', sale_price: '' });
  const [batchProducts, setBatchProducts] = useState([]);

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
  const handleFinalizeSale = async () => {
    // Mantém comportamento simples de demonstração; persistência pode ser ligada a sua API existente
    if (salesCart.length === 0) return;
    showToast('Venda registrada (simulação). Integração com persistência pode ser reativada.', 'success');
    setSalesCart([]); setSaleDiscount('');
  };

  // Custos
  const [costBase, setCostBase] = useState('');
  const [freight, setFreight] = useState('');
  const [packaging, setPackaging] = useState('');
  const [otherCosts, setOtherCosts] = useState('');
  const [otherCostsPercent, setOtherCostsPercent] = useState('');
  const [icms, setIcms] = useState('');
  const [ipi, setIpi] = useState('');
  const [pis, setPis] = useState('');
  const [cofins, setCofins] = useState('');
  const [iss, setIss] = useState('');
  const [calcMode, setCalcMode] = useState('margin');
  const [targetMargin, setTargetMargin] = useState('');
  const [salePriceInput, setSalePriceInput] = useState('');
  const [calcSimpleMode, setCalcSimpleMode] = useState(true);
  const [taxTotal, setTaxTotal] = useState('');
  const [calcProductId, setCalcProductId] = useState('');
  const [calcSearch, setCalcSearch] = useState('');
  const [calcSuggestOpen, setCalcSuggestOpen] = useState(false);
  const toNum = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(n) ? 0 : n; };
  const baseCosts = toNum(costBase) + toNum(freight) + toNum(packaging) + toNum(otherCosts);
  const otherCostsPercentValue = baseCosts * (toNum(otherCostsPercent) / 100);
  const totalBaseCosts = baseCosts + otherCostsPercentValue;
  const taxRate = calcSimpleMode ? (toNum(taxTotal) / 100)
    : (toNum(icms) + toNum(ipi) + toNum(pis) + toNum(cofins) + toNum(iss)) / 100;
  const costWithTaxes = totalBaseCosts * (1 + taxRate);
  const computedByMargin = targetMargin ? (costWithTaxes / (1 - toNum(targetMargin) / 100)) : costWithTaxes;
  const effectiveSalePrice = calcMode === 'margin' ? computedByMargin : toNum(salePriceInput);
  const effectiveMargin = effectiveSalePrice > 0 ? ((effectiveSalePrice - costWithTaxes) / effectiveSalePrice) * 100 : 0;
  const selectedCalcProduct = products.find(p => String(p.id) === String(calcProductId));
  const calcMatches = calcSearch.trim()
    ? products.filter(p => String(p.name||'').toLowerCase().includes(calcSearch.trim().toLowerCase())
        || String(p.barcode||'').includes(calcSearch.trim()))
    : [];
  const handleApplyCalculatedPrices = async () => {
    if (!selectedCalcProduct) { showToast('Selecione um produto', 'danger'); return; }
    try {
      const patch = { cost_price: Number(costWithTaxes||0), sale_price: Number(effectiveSalePrice||0) };
      const { error } = await supabase.from('products').update(patch).eq('id', selectedCalcProduct.id).eq('user_id', userId);
      if (error) throw error;
      setProducts(prev => prev.map(p => p.id === selectedCalcProduct.id ? { ...p, ...patch } : p));
      showToast('Preços aplicados');
    } catch { showToast('Erro ao aplicar preços', 'danger'); }
  };
  const showToast = (message, type = 'success', ms = 2500) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), ms);
  };

  const filteredProducts = useMemo(() => {
    let arr = products;
    const q = search.trim().toLowerCase();
    if (q) arr = arr.filter(p => String(p.name || '').toLowerCase().includes(q) || String(p.barcode || '').toLowerCase().includes(q));
    if (filters.minPrice) arr = arr.filter(p => Number(p.sale_price || 0) >= Number(filters.minPrice));
    if (filters.maxPrice) arr = arr.filter(p => Number(p.sale_price || 0) <= Number(filters.maxPrice));
    if (filters.minStock) arr = arr.filter(p => Number(p.quantity || 0) >= Number(filters.minStock));
    if (filters.maxStock) arr = arr.filter(p => Number(p.quantity || 0) <= Number(filters.maxStock));
    if (filters.stockStatus === 'low') arr = arr.filter(p => Number(p.quantity || 0) < 10);
    if (filters.stockStatus === 'normal') arr = arr.filter(p => Number(p.quantity || 0) >= 10 && Number(p.quantity || 0) < 50);
    if (filters.stockStatus === 'high') arr = arr.filter(p => Number(p.quantity || 0) >= 50);
    return arr;
  }, [products, search, filters]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      const uid = session?.user?.id || null;
      setUserId(uid);
      if (!uid) {
        navigate('/', { replace: true });
        return;
      }
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
      const { error } = await supabase
        .from('products')
        .insert([{ user_id: userId, name, barcode, quantity, cost_price, sale_price }]);
      if (error) throw error;
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
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== id));
      showToast('Produto excluído', 'success');
    } catch (e) {
      setError(e?.message || 'Falha ao excluir');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
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

  // Entrada (modo simples e avançado) — remoção padronizada por id
  const genId = () => (globalThis.crypto?.randomUUID?.() || `id_${Date.now()}_${Math.random().toString(16).slice(2)}`);
  const handleQuickEntryChange = (field, value) => setQuickEntry(prev => ({ ...prev, [field]: value }));
  const handleQuickAddToBatch = () => {
    const barcode = String(quickEntry.barcode || '').trim();
    const name = String(quickEntry.name || '').trim();
    const quantity = parseInt(quickEntry.quantity || '0', 10) || 0;
    const cost_price = quickEntry.cost_price ? Number(String(quickEntry.cost_price).replace(',', '.')) : 0;
    const sale_price = quickEntry.sale_price ? Number(String(quickEntry.sale_price).replace(',', '.')) : 0;
    if (!barcode || !name || quantity <= 0) { showToast('Preencha código, nome e quantidade', 'danger'); return; }
    setBatchProducts(prev => [...prev, { id: genId(), barcode, name, quantity, cost_price, sale_price }]);
    setQuickEntry({ barcode: '', name: '', quantity: '', cost_price: '', sale_price: '' });
  };
  const handleRemoveBatchRow = (rowId) => setBatchProducts(prev => prev.filter(r => r.id !== rowId));
  const handleBatchSubmit = async () => {
    if (!userId || batchProducts.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const rows = batchProducts.map(r => ({
        user_id: userId,
        barcode: r.barcode,
        name: r.name,
        quantity: Number(r.quantity || 0),
        cost_price: Number(r.cost_price || 0),
        sale_price: Number(r.sale_price || 0)
      }));
      const { error } = await supabase.from('products').insert(rows);
      if (error) throw error;
      setBatchProducts([]);
      setShowEntryModal(false);
      fetchProducts();
      showToast('Entrada processada');
    } catch (e) {
      setError(e?.message || 'Falha ao processar entrada');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async () => {
    if (!selectedProduct || !userId) return;
    const quantity = parseInt(customValue || '0', 10);
    if (Number.isNaN(quantity) || quantity < 0) { showToast('Quantidade inválida', 'danger'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from('products').update({ quantity }).eq('id', selectedProduct.id).eq('user_id', userId);
      if (error) throw error;
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
      const { error } = await supabase.from('products').update(patch).eq('id', selectedProduct.id).eq('user_id', userId);
      if (error) throw error;
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

        {/* Main */}
        <div className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <DashboardHeader sidebarOpen={sidebarOpen} onToggle={toggleSidebar} />

          {activeTab === 'dashboard' && (
            <div className="card">
              <div className="sales-summary">
                <h2>Resumo</h2>
                <div className="sales-stats">
                  <div className="stat-card" onClick={() => handleTabChange('historico')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon"><i className="fas fa-money-bill-wave"></i></div>
                    <div className="stat-content">
                      <div className="stat-label">Total de Vendas</div>
                      <div className="stat-value">{formatCurrency(0)}</div>
                    </div>
                  </div>
                  <div className="stat-card" onClick={() => handleTabChange('produtos')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon"><i className="fas fa-boxes"></i></div>
                    <div className="stat-content">
                      <div className="stat-label">Total de Produtos</div>
                      <div className="stat-value">{products.length}</div>
                    </div>
                  </div>
                  <div className="stat-card" onClick={() => handleTabChange('produtos')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon"><i className="fas fa-exclamation-triangle"></i></div>
                    <div className="stat-content">
                      <div className="stat-label">Estoque Baixo</div>
                      <div className="stat-value">{products.filter(p => Number(p.quantity||0) < 10).length}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'produtos' && (
            <ProductsPanel
              search={search}
              setSearch={setSearch}
              filters={filters}
              setFilters={setFilters}
              form={form}
              handleChange={handleChange}
              handleCreate={handleCreate}
              loading={loading}
              filteredProducts={filteredProducts}
              handleDelete={handleDelete}
              onOpenEntryModal={()=>setShowEntryModal(true)}
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
            <SalesHistory userId={userId} showToast={showToast} formatCurrency={(v)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} />
          )}

          {activeTab === 'api' && <ApiPanel />}

          {activeTab === 'custos' && (
            <CostsPanel
              calcSearch={calcSearch}
              setCalcSearch={setCalcSearch}
              calcSuggestOpen={calcSuggestOpen}
              setCalcSuggestOpen={setCalcSuggestOpen}
              calcMatches={calcMatches}
              setCalcProductId={setCalcProductId}
              setCostBase={setCostBase}
              selectedCalcProduct={selectedCalcProduct}
              formatCurrency={formatCurrency}
              baseCosts={baseCosts}
              freight={freight} setFreight={setFreight}
              packaging={packaging} setPackaging={setPackaging}
              otherCosts={otherCosts} setOtherCosts={setOtherCosts}
              otherCostsPercent={otherCostsPercent} setOtherCostsPercent={setOtherCostsPercent}
              calcSimpleMode={calcSimpleMode} setCalcSimpleMode={setCalcSimpleMode}
              taxTotal={taxTotal} setTaxTotal={setTaxTotal}
              icms={icms} setIcms={setIcms}
              ipi={ipi} setIpi={setIpi}
              pis={pis} setPis={setPis}
              cofins={cofins} setCofins={setCofins}
              iss={iss} setIss={setIss}
              costBase={costBase}
              calcMode={calcMode} setCalcMode={setCalcMode}
              targetMargin={targetMargin} setTargetMargin={setTargetMargin}
              salePriceInput={salePriceInput} setSalePriceInput={setSalePriceInput}
              costWithTaxes={costWithTaxes}
              effectiveSalePrice={effectiveSalePrice}
              effectiveMargin={effectiveMargin}
              handleApplyCalculatedPrices={handleApplyCalculatedPrices}
            />
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
          <div className={`toast ${toast.type}`}>{toast.message}</div>
        )}

        <EntryModal
          open={showEntryModal}
          onClose={()=>setShowEntryModal(false)}
          simpleMode={simpleMode}
          setSimpleMode={setSimpleMode}
          quickEntry={quickEntry}
          onQuickChange={(f,v)=>handleQuickEntryChange(f,v)}
          onQuickAdd={handleQuickAddToBatch}
          batchProducts={batchProducts}
          onRemoveRow={handleRemoveBatchRow}
          onSubmit={handleBatchSubmit}
        />

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

