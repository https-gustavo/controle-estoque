import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import SalesHistory from './SalesHistory';
import '../styles/Dashboard.css';
import { useNavigate } from 'react-router-dom';

/**
 * Dashboard Principal - Sistema de Controle de Estoque
 * 
 * Componente principal que gerencia:
 * - Produtos e estoque
 * - Vendas e carrinho
 * - Relatórios e estatísticas
 * - Configurações da empresa
 */
export default function Dashboard({ setUser }) {
  
  // Estados dos produtos
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [stockFilter, setStockFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // Estados dos modais
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showQuickEntryModal, setShowQuickEntryModal] = useState(false);
  const [showSaleDetailsModal, setShowSaleDetailsModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  
  // Estados de edição
  const [selectedSaleGroup, setSelectedSaleGroup] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [customValue, setCustomValue] = useState('');
  const [editCostPrice, setEditCostPrice] = useState('');
  const [editSalePrice, setEditSalePrice] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  
  // Estados do carrinho de vendas
  const [salesCart, setSalesCart] = useState([]);
  const [saleDiscount, setSaleDiscount] = useState('');
  const [saleSearch, setSaleSearch] = useState('');
  const [saleSuggestions, setSaleSuggestions] = useState([]);
  const [saleSuggestionIndex, setSaleSuggestionIndex] = useState(-1);
  
  // Estados do histórico de vendas
  const [salesHistoryGroups, setSalesHistoryGroups] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState('all');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  
  // Estados das estatísticas
  const [totalSales, setTotalSales] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  
  // Estados da interface
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    // Recupera a aba ativa do localStorage ou usa 'dashboard' como padrão
    return localStorage.getItem('activeTab') || 'dashboard';
  });
  const [userId, setUserId] = useState(null);
  
  // Estado do tema
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('darkMode') || 'false');
      document.documentElement.setAttribute('data-theme', saved ? 'dark' : 'light');
      return saved;
    } catch {
      document.documentElement.setAttribute('data-theme', 'light');
      return false;
    }
  });
  
  // Configurações da empresa
  const [companySettings, setCompanySettings] = useState({
    name: 'Estoque Pro',
    logo: ''
  });

  // Estados da calculadora de custos
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
  const [salePriceEdit, setSalePriceEdit] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);

  const toNum = (v) => {
    const n = parseFloat(String(v ?? '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  };

  const baseCosts = toNum(costBase) + toNum(freight) + toNum(packaging) + toNum(otherCosts);
  const otherCostsPercentValue = baseCosts * (toNum(otherCostsPercent) / 100);
  const totalBaseCosts = baseCosts + otherCostsPercentValue;
  const taxRate = calcSimpleMode
    ? (toNum(taxTotal) / 100)
    : (toNum(icms) + toNum(ipi) + toNum(pis) + toNum(cofins) + toNum(iss)) / 100;
  const costWithTaxes = totalBaseCosts * (1 + taxRate);
  const computedByMargin = targetMargin ? (costWithTaxes / (1 - toNum(targetMargin) / 100)) : costWithTaxes;
  const effectiveSalePrice = calcMode === 'margin' ? computedByMargin
                           : toNum(salePriceInput);
  const effectiveMargin = effectiveSalePrice > 0
    ? ((effectiveSalePrice - costWithTaxes) / effectiveSalePrice) * 100
    : 0;

  // Produto selecionado na calculadora
  const selectedCalcProduct = products.find(p => String(p.id) === String(calcProductId));
  const useSelectedProductCost = () => {
    if (!selectedCalcProduct) return;
    const cost = selectedCalcProduct.cost_price ?? selectedCalcProduct.last_purchase_value ?? selectedCalcProduct.sale_price ?? 0;
    setCostBase(String(cost ?? ''));
  };

  const saveSalePrice = async () => {
    if (!selectedCalcProduct) { showToast('error', 'Selecione um produto primeiro'); return; }
    const newPrice = parseFloat(String(salePriceEdit).replace(',', '.'));
    if (!isFinite(newPrice) || newPrice <= 0) { showToast('error', 'Informe um preço válido (> 0)'); return; }

    setSavingPrice(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({ sale_price: newPrice })
        .eq('id', selectedCalcProduct.id);
      if (error) throw error;

      setProducts(prev => prev.map(p => p.id === selectedCalcProduct.id ? { ...p, sale_price: newPrice } : p));
      showToast('success', 'Preço de venda atualizado com sucesso!');
    } catch (err) {
      console.error('Erro ao atualizar preço:', err);
      showToast('error', 'Erro ao atualizar preço: ' + err.message);
    } finally {
      setSavingPrice(false);
    }
  };

  // Busca de produtos para calculadora
  const norm = (v) => String(v ?? '').toLowerCase();
  const calcMatches = calcSearch.trim()
    ? products.filter(p => {
        const byName = norm(p.name).includes(norm(calcSearch));
        const byCode = String(p.barcode ?? '').includes(calcSearch.trim());
        return byName || byCode;
      })
    : [];
  
  const navigate = useNavigate();

  const [batchProducts, setBatchProducts] = useState([{ barcode: '', name: '', quantity: '', cost_price: '', sale_price: '' }]);
  const [batchErrors, setBatchErrors] = useState([]);
  const [rowErrors, setRowErrors] = useState({});
  const [totals, setTotals] = useState({ qty: 0, cost: 0, value: 0, margin: 0 });
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message }
  const [quickEntry, setQuickEntry] = useState({ barcode: '', name: '', quantity: '', cost_price: '', markup: '', sale_price: '' });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Estados de carregamento
  const [loading, setLoading] = useState({
    products: false,
    sales: false,
    batch: false,
    entry: false,
    delete: false
  });

  // Estados para confirmação visual
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmTitle, setConfirmTitle] = useState('');

  // Estados para filtros avançados
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    stockStatus: '',
    minStock: '',
    maxStock: ''
  });

  // Utilidades para destaque de texto nas sugestões
  const escapeRegex = (str) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };
  const renderHighlighted = (text, query) => {
    if (!text || !query) return text;
    const q = String(query).trim();
    if (!q) return text;
    try {
      const parts = String(text).split(new RegExp(`(${escapeRegex(q)})`, 'gi'));
      return parts.map((part, idx) => (
        part.toLowerCase() === q.toLowerCase()
          ? <mark key={idx}>{part}</mark>
          : <span key={idx}>{part}</span>
      ));
    } catch (e) {
      return text;
    }
  };
  const [simpleMode, setSimpleMode] = useState(() => {
    try { return JSON.parse(localStorage.getItem('simpleMode') || 'true'); } catch { return true; }
  });
  const [simpleList, setSimpleList] = useState([]); // { barcode, name, quantity }

  // Carrega e persiste configurações da empresa
  useEffect(() => {
    const key = userId ? `companySettings:${userId}` : 'companySettings';
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      if (saved && (saved.name || saved.logo)) {
        setCompanySettings(prev => ({ ...prev, ...saved }));
      }
    } catch {}
    
    // Sincroniza com o Supabase quando há usuário logado
    if (userId) {
      (async () => {
        try {
          const { data, error } = await supabase
            .from('store_settings')
            .select('name, logo')
            .eq('user_id', userId)
            .maybeSingle(); // Usar maybeSingle() em vez de single() para evitar erro quando não há dados
          if (!error && data) {
            setCompanySettings(prev => ({
              ...prev,
              name: typeof data.name !== 'undefined' && data.name !== null ? data.name : prev.name,
              logo: typeof data.logo !== 'undefined' && data.logo !== null ? data.logo : prev.logo,
            }));
          }
        } catch (err) {
          console.warn('Falha ao carregar store_settings do Supabase:', err?.message || err);
        }
      })();
    }
  }, [userId]);

  const saveCompanySettings = async () => {
    try {
      const key = userId ? `companySettings:${userId}` : 'companySettings';
      localStorage.setItem(key, JSON.stringify(companySettings));
      // Persistir por usuário no Supabase (tabela: store_settings)
      if (userId) {
        const row = {
          user_id: userId,
          name: companySettings.name || null,
          logo: companySettings.logo || null,
          updated_at: new Date().toISOString(),
        };
        try {
          const { error } = await supabase
            .from('store_settings')
            .upsert([row], { onConflict: 'user_id' });
          if (error) throw error;
        } catch (err) {
          console.warn('Falha ao salvar store_settings no Supabase:', err?.message || err);
        }
      }
      setToast({ type: 'success', message: 'Configurações salvas com sucesso.' });
    } catch (err) {
      setToast({ type: 'error', message: 'Falha ao salvar configurações.' });
    }
  };

  /**
   * Aplica os preços calculados na calculadora ao produto selecionado
   * Atualiza o custo e preço de venda no banco de dados
   */
  const handleApplyCalculatedPrices = async () => {
    if (!selectedCalcProduct || costWithTaxes <= 0 || effectiveSalePrice <= 0) {
      showToast('Erro: Produto não selecionado ou valores inválidos.', 'error');
      return;
    }
    
    // Primeiro tenta com cost_price, se falhar usa last_purchase_value (compatibilidade)
    const updateData = {
      cost_price: costWithTaxes,
      sale_price: effectiveSalePrice
    };
    
    const { error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', selectedCalcProduct.id)
      .eq('user_id', userId);
      
    if (error) {
      // Se der erro com cost_price, tenta com last_purchase_value (schema legado)
      if (error.message.includes('cost_price')) {
        const legacyUpdateData = {
          last_purchase_value: costWithTaxes,
          sale_price: effectiveSalePrice
        };
        
        const { error: legacyError } = await supabase
          .from('products')
          .update(legacyUpdateData)
          .eq('id', selectedCalcProduct.id)
          .eq('user_id', userId);
          
        if (legacyError) {
          console.error('Erro ao aplicar preços calculados (legacy):', legacyError);
          showToast('Erro ao aplicar preços calculados.', 'error');
          return;
        }
      } else {
        console.error('Erro ao aplicar preços calculados:', error);
        showToast('Erro ao aplicar preços calculados.', 'error');
        return;
      }
    }
    
    // Atualizar a lista de produtos
    fetchProducts();
    showToast(`Preços aplicados com sucesso ao produto "${selectedCalcProduct.name}"!`, 'success');
    
    // Limpar calculadora
    setCostBase('');
    setFreight('');
    setPackaging('');
    setOtherCosts('');
    setOtherCostsPercent('');
    setIcms('');
    setIpi('');
    setPis('');
    setCofins('');
    setIss('');
    setTaxTotal('');
    setTargetMargin('');
    setSalePriceInput('');
    setCalcProductId('');
    setSelectedCalcProduct(null);
  };

  const handleLogoFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop();
    const fileName = `logo_${Date.now()}.${ext || 'png'}`;
    try {
      const { data, error } = await supabase.storage.from('logos').upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = await supabase.storage.from('logos').getPublicUrl(data.path);
      const publicUrl = pub?.publicUrl || '';
      if (publicUrl) {
        setCompanySettings(prev => ({ ...prev, logo: publicUrl }));
        if (userId) {
          try {
            await supabase
              .from('store_settings')
              .upsert([{ user_id: userId, logo: publicUrl, name: companySettings.name || null, updated_at: new Date().toISOString() }], { onConflict: 'user_id' });
          } catch (err) {
            console.warn('Falha ao salvar logo em store_settings:', err?.message || err);
          }
        }
        setToast({ type: 'success', message: 'Logo enviada para armazenamento e aplicada.' });
        return;
      }
      throw new Error('Sem URL pública');
    } catch (_err) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        setCompanySettings(prev => ({ ...prev, logo: dataUrl }));
        if (userId) {
          supabase
            .from('store_settings')
            .upsert([{ user_id: userId, logo: dataUrl, name: companySettings.name || null, updated_at: new Date().toISOString() }], { onConflict: 'user_id' })
            .catch((err) => console.warn('Falha ao salvar logo base64 em store_settings:', err?.message || err));
        }
        setToast({ type: 'success', message: 'Logo carregada localmente e aplicada.' });
      };
      reader.onerror = () => setToast({ type: 'error', message: 'Falha ao ler imagem do computador.' });
      reader.readAsDataURL(file);
    }
  };


  useEffect(() => {
    localStorage.setItem('simpleMode', JSON.stringify(simpleMode));
  }, [simpleMode]);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const newMode = !prev;
      document.documentElement.setAttribute('data-theme', newMode ? 'dark' : 'light');
      localStorage.setItem('darkMode', JSON.stringify(newMode));
      return newMode;
    });
  };

  useEffect(() => {
    if (showEntryModal) {
      const dm = localStorage.getItem('defaultMarkup');
      if (dm && (quickEntry.markup === '' || typeof quickEntry.markup === 'undefined')) {
        setQuickEntry(prev => ({ ...prev, markup: dm }));
      }
    }
  }, [showEntryModal]);

  useEffect(() => {
    if (quickEntry.markup !== '' && typeof quickEntry.markup !== 'undefined') {
      localStorage.setItem('defaultMarkup', String(quickEntry.markup));
    }
  }, [quickEntry.markup]);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Erro ao obter sessão:', error);
          showToast('Erro de autenticação. Faça login novamente.', 'error');
          return;
        }
        
        if (!cancelled) {
          const userId = session?.user?.id ?? null;
          console.log('Sessão inicializada:', { userId, session: !!session });
          setUserId(userId);
          
          if (!userId) {
            console.warn('Usuário não autenticado');
            showToast('Sessão expirada. Faça login novamente.', 'warning');
          }
        }
      } catch (err) {
        console.error('Erro inesperado ao inicializar sessão:', err);
        if (!cancelled) {
          showToast('Erro ao verificar autenticação.', 'error');
        }
      }
    };
    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Mudança de autenticação:', { event, userId: session?.user?.id });
      setUserId(session?.user?.id ?? null);
      
      if (event === 'SIGNED_OUT') {
        showToast('Sessão encerrada.', 'info');
      } else if (event === 'SIGNED_IN') {
        showToast('Login realizado com sucesso!', 'success');
      }
    });

    return () => {
      cancelled = true;
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (userId) {
      fetchProducts();
    }
  }, [userId]);

  // Função helper para mudança de aba com persistência
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('activeTab', tab);
  };

  // Atalhos de teclado para navegação rápida
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Verificar se não está em um input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      // Atalhos com Ctrl
      if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'n': // Ctrl+N - Nova entrada
            e.preventDefault();
            setShowEntryModal(true);
            break;
          case 'v': // Ctrl+V - Nova venda
            e.preventDefault();
            setShowSaleModal(true);
            break;
          case 'b': // Ctrl+B - Entrada em lote
            e.preventDefault();
            setShowBatchModal(true);
            break;
          case 'q': // Ctrl+Q - Entrada rápida
            e.preventDefault();
            setShowQuickEntryModal(true);
            break;
          case 'f': // Ctrl+F - Focar na busca
            e.preventDefault();
            const searchInput = document.querySelector('input[placeholder*="Buscar"]');
            if (searchInput) searchInput.focus();
            break;
          case 'h': // Ctrl+H - Histórico de vendas
            e.preventDefault();
            handleTabChange('history');
            break;
          case 'd': // Ctrl+D - Dashboard
            e.preventDefault();
            handleTabChange('dashboard');
            break;
          case 'c': // Ctrl+C - Calculadora
            e.preventDefault();
            handleTabChange('calculator');
            break;
          case 't': // Ctrl+T - Alternar tema
            e.preventDefault();
            toggleDarkMode();
            break;
        }
      }

      // Atalhos sem modificadores
      switch (e.key) {
        case 'Escape': // ESC - Fechar modais
          e.preventDefault();
          setShowBatchModal(false);
          setShowEntryModal(false);
          setShowQuantityModal(false);
          setShowSaleModal(false);
          setShowQuickEntryModal(false);
          setShowSaleDetailsModal(false);
          setShowPriceModal(false);
          break;
        case 'F1': // F1 - Ajuda (mostrar atalhos)
          e.preventDefault();
          showKeyboardShortcuts();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Função para mostrar atalhos de teclado
  const showKeyboardShortcuts = () => {
    const shortcuts = `🎯 ATALHOS DE TECLADO:

📦 PRODUTOS:
• Ctrl+N - Nova entrada de produto
• Ctrl+Q - Entrada rápida
• Ctrl+B - Entrada em lote

💰 VENDAS:
• Ctrl+V - Nova venda
• Ctrl+H - Histórico de vendas

🔍 NAVEGAÇÃO:
 • Ctrl+F - Focar na busca
 • Ctrl+D - Dashboard
 • Ctrl+C - Calculadora
 • Ctrl+T - Alternar tema

 ⚡ GERAL:
 • ESC - Fechar modais
 • F1 - Mostrar atalhos`;
    
    alert(shortcuts);
  };

  useEffect(() => {
    if (products.length > 0) {
      const filtered = products.filter(product => {
        const q = String(searchTerm || '').trim().toLowerCase();
        const matchesQuery = q === ''
          ? true
          : (
              String(product.name || '').toLowerCase().includes(q) ||
              String(product.barcode || '').toLowerCase().includes(q)
            );
        const matchesStock =
          stockFilter === 'all' ? true :
          stockFilter === 'low' ? product.quantity < 10 :
          product.quantity >= 10;
        const matchesCategory = categoryFilter === '' ? true : String(product.category_id || '').includes(categoryFilter);
        
        // Filtros avançados
        const matchesAdvancedFilters = !showAdvancedFilters || (
          (filters.minPrice === '' || product.sale_price >= parseFloat(filters.minPrice)) &&
          (filters.maxPrice === '' || product.sale_price <= parseFloat(filters.maxPrice)) &&
          (filters.minStock === '' || product.quantity >= parseInt(filters.minStock)) &&
          (filters.maxStock === '' || product.quantity <= parseInt(filters.maxStock)) &&
          (filters.stockStatus === '' || 
            (filters.stockStatus === 'low' && product.quantity < 10) ||
            (filters.stockStatus === 'normal' && product.quantity >= 10 && product.quantity < 50) ||
            (filters.stockStatus === 'high' && product.quantity >= 50)
          )
        );
        
        return matchesQuery && matchesStock && matchesCategory && matchesAdvancedFilters;
      });
      setFilteredProducts(filtered);
      
      // Atualizar estatísticas
      setTotalProducts(products.length);
      setLowStockCount(products.filter(p => p.quantity < 10).length);
    }
  }, [products, searchTerm, filters, showAdvancedFilters]);

  /**
   * 🔄 BUSCAR PRODUTOS - A função que traz todos os seus produtos
   * 
   * Esta é uma das funções mais importantes! Ela:
   * - 📥 Busca todos os produtos do banco de dados
   * - 📊 Calcula as estatísticas (total de vendas, produtos, etc.)
   * - 🛡️ Tem proteção contra erros do Supabase
   * - ⚡ Atualiza a interface automaticamente
   * 
   * É chamada sempre que algo muda nos produtos!
   */
  const fetchProducts = async () => {
    setLoading(prev => ({ ...prev, products: true }));
    
    try {
      // Busca os produtos do usuário, ordenados por nome
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .order('name');
      
      if (error) {
        console.error('Erro ao buscar produtos:', error);
        // Se der erro na ordenação, tenta sem ordenar (fallback)
        if (/name/i.test(error.message || '')) {
          const { data: dataNoOrder, error: errNoOrder } = await supabase
            .from('products')
            .select('*')
            .eq('user_id', userId);
          if (!errNoOrder) {
            setProducts(dataNoOrder || []);
          }
        }
      } else {
        // Sucesso! Atualiza a lista de produtos
        setProducts(data || []);
      }
      
      // Calcula o total de vendas para o dashboard
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('total')
        .eq('user_id', userId);
        
      if (!salesError && salesData) {
        const total = salesData.reduce((sum, sale) => sum + sale.total, 0);
        setTotalSales(total);
      }
    } finally {
      // 🏁 Para de mostrar o carregamento
      setLoading(prev => ({ ...prev, products: false }));
    }
  };

  const handleCustomValueChange = (e) => {
    const value = e.target.value;
    if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
      setCustomValue(value);
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpdateQuantity = async () => {
    if (!selectedProduct || !customValue) return;
    
    const newQuantity = parseFloat(customValue);
    
    const { error } = await supabase
      .from('products')
      .update({ quantity: newQuantity })
      .eq('id', selectedProduct.id)
      .eq('user_id', userId);
      
    if (error) {
      console.error('Erro ao atualizar quantidade:', error);
      alert('Erro ao atualizar quantidade do produto.');
    } else {
      // Atualizar a lista de produtos
      fetchProducts();
      setShowQuantityModal(false);
      setCustomValue('');
      setSelectedProduct(null);
    }
  };

  const handleUpdatePrices = async () => {
    if (!selectedProduct) return;
    
    // Verificar se o usuário está autenticado
    if (!userId) {
      showToast('Usuário não autenticado. Faça login novamente.', 'error');
      return;
    }
    
    // Preparar objeto de atualização apenas com campos preenchidos
    const updateData = {};
    
    if (editCostPrice && editCostPrice.trim() !== '') {
      updateData.cost_price = parseFloat(editCostPrice);
    }
    
    if (editSalePrice && editSalePrice.trim() !== '') {
      updateData.sale_price = parseFloat(editSalePrice);
    }
    
    // Se nenhum campo foi preenchido, não fazer nada
    if (Object.keys(updateData).length === 0) {
      showToast('Preencha pelo menos um campo para atualizar.', 'warning');
      return;
    }
    
    console.log('Tentando atualizar produto:', {
      productId: selectedProduct.id,
      userId: userId,
      updateData: updateData
    });
    
    try {
      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', selectedProduct.id)
        .eq('user_id', userId)
        .select();
        
      if (error) {
        console.error('Erro detalhado ao atualizar preços:', {
          error: error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Tentar com fallback para last_purchase_value se cost_price falhar
        if (error.message && error.message.includes('cost_price')) {
          console.log('Tentando fallback com last_purchase_value...');
          const fallbackData = { ...updateData };
          if (fallbackData.cost_price) {
            fallbackData.last_purchase_value = fallbackData.cost_price;
            delete fallbackData.cost_price;
          }
          
          const { data: fallbackResult, error: fallbackError } = await supabase
            .from('products')
            .update(fallbackData)
            .eq('id', selectedProduct.id)
            .eq('user_id', userId)
            .select();
            
          if (fallbackError) {
            console.error('Erro no fallback:', fallbackError);
            showToast(`Erro ao atualizar preços: ${fallbackError.message}`, 'error');
            return;
          } else {
            console.log('Fallback bem-sucedido:', fallbackResult);
          }
        } else {
          showToast(`Erro ao atualizar preços: ${error.message}`, 'error');
          return;
        }
      } else {
        console.log('Atualização bem-sucedida:', data);
      }
      
      // Atualizar a lista de produtos
      fetchProducts();
      setShowPriceModal(false);
      setEditCostPrice('');
      setEditSalePrice('');
      setSelectedProduct(null);
      showToast('Preços atualizados com sucesso!', 'success');
      
    } catch (err) {
      console.error('Erro inesperado ao atualizar preços:', err);
      showToast(`Erro inesperado: ${err.message}`, 'error');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!productId || !userId) return;
    
    setConfirmTitle('Confirmar Exclusão');
    setConfirmMessage('Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.');
    setConfirmAction(() => async () => {
      setLoading(prev => ({ ...prev, delete: true }));
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('user_id', userId);

      setLoading(prev => ({ ...prev, delete: false }));

      if (error) {
        console.error('Erro ao excluir produto:', error);
        showToast('error', 'Erro ao excluir produto.');
      } else {
        fetchProducts();
        showToast('success', 'Produto excluído com sucesso.');
      }
      setShowConfirmModal(false);
    });
    setShowConfirmModal(true);
  };
  
  const handleRegisterSale = async () => {
    if (!selectedProduct || !customValue) return;
    
    const quantity = parseFloat(customValue);
    const price = unitPrice !== '' ? parseFloat(unitPrice) : selectedProduct.sale_price;
    // validação de preço mínimo baseado no custo (suporta last_purchase_value)
    const minCost =
      typeof selectedProduct.cost_price === 'number'
        ? selectedProduct.cost_price
        : typeof selectedProduct.last_purchase_value === 'number'
        ? selectedProduct.last_purchase_value
        : null;
    if (minCost !== null && price < minCost) {
      alert('Preço unitário abaixo do custo. Ajuste para um valor igual ou superior ao custo.');
      return;
    }
    const total = quantity * price;
    
    // Registrar venda
    const { error: saleError } = await supabase
      .from('sales')
      .insert([
        { 
          product_id: selectedProduct.id,
          quantity: quantity,
          total: total,
          unit_price: price,
          // canal removido
          date: new Date(),
          user_id: userId
        }
      ]);
      
    if (saleError) {
      console.error('Erro ao registrar venda:', saleError);
      alert('Erro ao registrar venda.');
      return;
    }
    
    // Atualizar estoque
    const newQuantity = selectedProduct.quantity - quantity;
    const { error: updateError } = await supabase
      .from('products')
      .update({ quantity: newQuantity })
      .eq('id', selectedProduct.id)
      .eq('user_id', userId);
      
    if (updateError) {
      console.error('Erro ao atualizar estoque:', updateError);
      alert('Venda registrada, mas erro ao atualizar estoque.');
    } else {
      fetchProducts();
      setShowSaleModal(false);
      setCustomValue('');
      setUnitPrice('');
      // canal removido
      setSelectedProduct(null);
    }
  };

  // ===== Fluxo de vendas com carrinho rápido =====
  const addProductToCart = (product, qty = 1) => {
    if (!product || qty <= 0) return;
    setSalesCart(prev => {
      const existing = prev.find(it => it.id === product.id);
      if (existing) {
        return prev.map(it => it.id === product.id ? { ...it, quantity: it.quantity + qty } : it);
      }
      
      // Melhorar a lógica de nome do produto
      let productName = '';
      if (product.name && product.name.trim()) {
        productName = product.name.trim();
      } else if (product.product_name && product.product_name.trim()) {
        productName = product.product_name.trim();
      } else if (product.barcode) {
        productName = `Produto ${product.barcode}`;
      } else {
        productName = 'Produto sem nome';
      }
      
      return [...prev, {
        id: product.id,
        barcode: product.barcode,
        name: productName,
        unit_price: Number(product.sale_price) || 0,
        quantity: qty,
      }];
    });
    showToast('success', 'Produto adicionado ao carrinho');
  };

  const removeFromCart = (productId) => {
    setSalesCart(prev => prev.filter(it => it.id !== productId));
  };

  const updateCartQty = (productId, qty) => {
    const q = parseInt(qty, 10);
    if (isNaN(q) || q <= 0) return;
    setSalesCart(prev => prev.map(it => it.id === productId ? { ...it, quantity: q } : it));
  };

  const cartSubtotal = salesCart.reduce((acc, it) => acc + (it.unit_price * it.quantity), 0);
  const discountValue = parseFloat(String(saleDiscount).replace(',', '.')) || 0;
  const cartTotal = Math.max(0, cartSubtotal - discountValue);
  const stripAccents = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normalizeText = (s) => stripAccents(String(s || '').toLowerCase().trim());
  const nameKey = (p) => String(p.name || p.product_name || p.barcode || '');
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const getSuggestionRank = (p, query) => {
    const q = normalizeText(query);
    const name = normalizeText(p.name || p.product_name || '');
    const code = normalizeText(p.barcode);
    if (!q) return 5;
    // Sistema de ranking para melhorar a relevância das sugestões
    if (code === q) return 0;                                 // código exato
    if (name.startsWith(q)) return 1;                         // nome começa com
    if (new RegExp(`\\b${escapeRegExp(q)}`).test(name)) return 2; // início de palavra
    if (code.startsWith(q)) return 3;                         // código começa com
    if (name.includes(q)) return 4;                           // nome contém
    if (code.includes(q)) return 5;                           // código contém
    return 6;                                                 // pouco relevante
  };
  const compareByRelevance = (a, b, query) => {
    const ra = getSuggestionRank(a, query);
    const rb = getSuggestionRank(b, query);
    if (ra !== rb) return ra - rb; // menor rank = mais relevante
    const ia = Number(a.quantity || 0) > 0 ? 0 : 1;
    const ib = Number(b.quantity || 0) > 0 ? 0 : 1;
    if (ia !== ib) return ia - ib; // com estoque primeiro
    const la = String(a.name || a.product_name || '').length;
    const lb = String(b.name || b.product_name || '').length;
    if (la !== lb) return la - lb; // nomes mais curtos primeiro
    return nameKey(a).localeCompare(nameKey(b), 'pt-BR', { sensitivity: 'base' });
  };

  const handleQuickSaleSearchChange = (value) => {
    setSaleSearch(value);
    const v = String(value).toLowerCase();
    if (!v) { setSaleSuggestions([]); return; }
    const isShort = v.length <= 2;
    const sugs = products
      .filter(p => {
        const code = String(p.barcode || '').toLowerCase();
        const name = String(p.name || p.product_name || '').toLowerCase();
        if (isShort) {
          // Para consultas curtas, priorize somente prefixos (evita matches no meio como "Notebook")
          return code.startsWith(v) || name.startsWith(v);
        }
        return code.includes(v) || name.includes(v);
      })
      .sort((a, b) => compareByRelevance(a, b, v))
      .slice(0, 5);
    setSaleSuggestions(sugs);
    setSaleSuggestionIndex(sugs.length ? 0 : -1);
  };

  const handleAddBySearch = () => {
    const v = saleSearch.trim();
    if (!v) return;
    const match = products.find(p => String(p.barcode) === v) ||
                  products.find(p => String(p.name || p.product_name || '').toLowerCase() === v.toLowerCase());
    if (!match) { showToast('error', 'Produto não encontrado'); return; }
    addProductToCart(match, 1);
    setSaleSearch('');
    setSaleSuggestions([]);
    setSaleSuggestionIndex(-1);
  };

  const handleSearchKeyDown = (e) => {
    if (!saleSuggestions || saleSuggestions.length === 0) {
      if (e.key === 'Enter') { handleAddBySearch(); }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSaleSuggestionIndex((prev) => {
        const next = prev + 1;
        return next >= saleSuggestions.length ? saleSuggestions.length - 1 : next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSaleSuggestionIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? 0 : next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = saleSuggestions[saleSuggestionIndex >= 0 ? saleSuggestionIndex : 0];
      if (chosen) {
        addProductToCart(chosen, 1);
        setSaleSearch('');
        setSaleSuggestions([]);
        setSaleSuggestionIndex(-1);
      } else {
        handleAddBySearch();
      }
    } else if (e.key === 'Escape') {
      setSaleSuggestions([]);
      setSaleSuggestionIndex(-1);
    }
  };

  const incCartQty = (productId) => {
    const current = salesCart.find(it => it.id === productId);
    if (!current) return;
    updateCartQty(productId, current.quantity + 1);
  };
  const decCartQty = (productId) => {
    const current = salesCart.find(it => it.id === productId);
    if (!current) return;
    const next = Math.max(1, current.quantity - 1);
    updateCartQty(productId, next);
  };

  const handleFinalizeSale = async () => {
    if (!userId) { showToast('error', 'Usuário não autenticado'); return; }
    if (salesCart.length === 0) { showToast('error', 'Carrinho vazio'); return; }
    // validação de estoque
    for (const item of salesCart) {
      const prod = products.find(p => p.id === item.id);
      if (!prod) { showToast('error', `Produto inválido no carrinho: ${item.name}`); return; }
      if (prod.quantity < item.quantity) { showToast('error', `Estoque insuficiente para ${prod.name}`); return; }
    }

    const errors = [];
    const saleDate = new Date();
    
    // Calcular desconto proporcional por item
    const cartSubtotal = salesCart.reduce((acc, it) => acc + (it.unit_price * it.quantity), 0);
    const discountValue = parseFloat(String(saleDiscount).replace(',', '.')) || 0;
    const discountRatio = cartSubtotal > 0 ? discountValue / cartSubtotal : 0;
    
    for (const item of salesCart) {
      const itemSubtotal = item.unit_price * item.quantity;
      const itemDiscount = itemSubtotal * discountRatio;
      const total = Math.max(0, itemSubtotal - itemDiscount);
      
      const { error: saleError } = await supabase
        .from('sales')
        .insert([{ 
          product_id: item.id,
          quantity: item.quantity,
          total: total,
          unit_price: item.unit_price,
          // canal removido
          date: saleDate,
          user_id: userId
        }]);
      if (saleError) { errors.push(`Venda não registrada para ${item.name}: ${saleError.message}`); continue; }
      const prod = products.find(p => p.id === item.id);
      const newQty = Number(prod.quantity || 0) - Number(item.quantity || 0);
      const { error: upErr } = await supabase
        .from('products')
        .update({ quantity: newQty })
        .eq('id', item.id)
        .eq('user_id', userId);
      if (upErr) { errors.push(`Erro ao atualizar estoque de ${item.name}: ${upErr.message}`); }
    }

    if (errors.length) {
      showToast('error', 'Ocorreram erros em alguns itens.');
    } else {
      showToast('success', 'Venda finalizada!');
    }
    setSalesCart([]);
    setSaleDiscount('');
    fetchProducts();
    fetchSalesHistory();
  };

  const fetchSalesHistory = async () => {
    if (!userId) return;
    
    // Buscar vendas sem JOIN
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(100);
      
    if (salesError) {
      console.error('Erro ao carregar histórico de vendas:', salesError);
      return;
    }
    
    if (!salesData || salesData.length === 0) {
      setSalesHistoryGroups([]);
      setHistoryPage(1);
      return;
    }
    
    // Buscar produtos para obter nomes e códigos de barras
    const productIds = [...new Set(salesData.map(sale => sale.product_id).filter(Boolean))];
    let productsMap = new Map();
    
    if (productIds.length > 0) {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, barcode')
        .in('id', productIds);
        
      if (!productsError && productsData) {
        productsData.forEach(product => {
          productsMap.set(product.id, product);
        });
      }
    }
    
    // Combinar dados de vendas com produtos
    const enrichedSales = salesData.map(sale => ({
      ...sale,
      products: productsMap.get(sale.product_id) || { 
        name: sale.product_name || 'Produto não encontrado', 
        barcode: sale.barcode || '' 
      }
    }));
    
    const map = new Map();
    for (const row of enrichedSales) {
      const key = row.date; // mesmo date para itens de uma venda
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    const groups = Array.from(map.entries()).map(([date, items]) => ({
      date,
      items,
      total: items.reduce((acc, it) => acc + (Number(it.total) || 0), 0),
    }));
    setSalesHistoryGroups(groups);
    // Reinicia para a primeira página ao atualizar histórico
    setHistoryPage(1);
  };

  useEffect(() => {
    if (activeTab === 'vendas') fetchSalesHistory();
  }, [activeTab, userId]);

  /**
   * Função de logout do sistema
   * 
   * Realiza o logout seguro do usuário:
   * - Verifica se há sessão ativa
   * - Faz logout no Supabase
   * - Limpa dados locais
   * - Redireciona para login
   */
  const handleLogout = async () => {
    try {
      console.log('Iniciando logout...');
      
      // Verifica se há uma sessão ativa antes de tentar fazer logout
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { error } = await supabase.auth.signOut();
        
        if (error && !error.message.includes('Auth session missing')) {
          console.error('Erro ao fazer logout:', error);
          showToast('error', 'Erro ao sair: ' + error.message);
          return;
        }
      }
      
      setUser(null);
      
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-' + supabase.supabaseUrl.split('//')[1] + '-auth-token');
      
      navigate('/', { replace: true });
      
    } catch (err) {
      console.error('Erro inesperado no logout:', err);
      
      // Mesmo com erro, limpa tudo e redireciona
      setUser(null);
      localStorage.clear();
      navigate('/', { replace: true });
      
      showToast('error', 'Sessão encerrada (com limpeza forçada)');
    }
  };

  // Filtrar histórico de vendas
  const filteredSalesHistoryGroups = salesHistoryGroups.filter(group => {
    // Filtro por data
    if (historyDateFilter !== 'all') {
      const groupDate = new Date(group.date);
      const now = new Date();
      
      switch (historyDateFilter) {
        case 'today':
          if (groupDate.toDateString() !== now.toDateString()) return false;
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (groupDate < weekAgo) return false;
          break;
        case 'month':
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          if (groupDate < monthAgo) return false;
          break;
      }
    }
    
    // Filtro por produto
    if (historyFilter.trim()) {
      const searchTerm = historyFilter.toLowerCase().trim();
      const hasMatchingProduct = group.items.some(item => 
        (item.products?.name && item.products.name.toLowerCase().includes(searchTerm)) ||
        (item.products?.barcode && item.products.barcode.toLowerCase().includes(searchTerm))
      );
      if (!hasMatchingProduct) return false;
    }
    
    return true;
  });

  // Paginação do histórico filtrado
  const historyTotalPages = Math.max(1, Math.ceil((filteredSalesHistoryGroups?.length || 0) / historyPageSize));
  const clampedPage = Math.min(historyPage, historyTotalPages);
  const startIdx = (clampedPage - 1) * historyPageSize;
  const pagedFilteredSalesHistoryGroups = filteredSalesHistoryGroups.slice(startIdx, startIdx + historyPageSize);
  const goPrevHistoryPage = () => setHistoryPage((p) => Math.max(1, p - 1));
  const goNextHistoryPage = () => setHistoryPage((p) => Math.min(historyTotalPages, p + 1));
  const handlePageSizeChange = (val) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0) { setHistoryPageSize(n); setHistoryPage(1); }
  };

  const handleViewSaleDetails = (group) => {
    setSelectedSaleGroup(group);
    setShowSaleDetailsModal(true);
  };

  // Função para alternar sidebar com melhor comportamento mobile
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Função para fechar sidebar ao clicar no overlay (mobile)
  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Detectar redimensionamento e ajustar sidebar automaticamente
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 1024;
      
      if (isMobile) {
        // Em mobile/tablet, sidebar começa fechado
        setSidebarOpen(false);
      }
      // Em desktop, não forçar estado - deixar o usuário controlar
    };

    // Configurar estado inicial apenas para mobile
    const isMobile = window.innerWidth <= 1024;
    if (isMobile) {
      setSidebarOpen(false);
    }
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fechar sidebar ao clicar em links em mobile
  const handleMobileNavClick = () => {
    if (window.innerWidth <= 1024) {
      setSidebarOpen(false);
    }
  };

  const toNumber = (v) => {
    if (typeof v === 'number') return v;
    const n = parseFloat(String(v ?? '').replace(',', '.'));
    return isNaN(n) ? NaN : n;
  };

  const formatCurrency = (value) => {
    const n = toNumber(value);
    if (isNaN(n)) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(n);
  };

  const getCost = (product) => {
    if (typeof product?.cost_price !== 'undefined' && product?.cost_price !== null) {
      return product.cost_price;
    }
    return product?.last_purchase_value ?? null;
  };

  const normalizeNumber = (v) => {
    if (v === null || v === undefined || v === '') return '';
    const n = parseFloat(String(v).replace(',', '.'));
    return isNaN(n) ? '' : n;
  };

  const recomputeTotals = (list) => {
    const qty = list.reduce((s, p) => s + (parseFloat(p.quantity) || 0), 0);
    const cost = list.reduce((s, p) => s + ((parseFloat(String(p.cost_price).replace(',', '.')) || 0) * (parseFloat(p.quantity) || 0)), 0);
    const value = list.reduce((s, p) => s + ((parseFloat(String(p.sale_price).replace(',', '.')) || 0) * (parseFloat(p.quantity) || 0)), 0);
    const margin = value - cost;
    setTotals({ qty, cost, value, margin });
  };

  const handleMarkupChange = (e) => {
    const val = e.target.value;
    setMarkupPercent(val);
    const m = parseFloat(val);
    if (isNaN(m)) return;
    const updated = batchProducts.map((row) => {
      const c = parseFloat(String(row.cost_price).replace(',', '.'));
      if (!isNaN(c)) {
        const sale = +(c * (1 + m / 100)).toFixed(2);
        return { ...row, sale_price: String(sale) };
      }
      return row;
    });
    setBatchProducts(updated);
    recomputeTotals(updated);
  };

  const handlePasteToBatch = (text) => {
    if (!text) return;
    try {
      const lines = text.trim().split(/\r?\n/);
      const sepGuess = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : (lines[0].includes('\t') ? '\t' : ',');
      const header = lines[0].toLowerCase();
      const hasHeader = /barcode|código|code/.test(header) || /name|produto/.test(header);
      const start = hasHeader ? 1 : 0;
      const parsed = [];
      const errs = [];
      for (let i = start; i < lines.length; i++) {
        const raw = lines[i];
        if (!raw.trim()) continue;
        const cols = raw.split(sepGuess).map((c) => c.trim());
        const [barcode, name, quantity, cost_price, sale_price] = cols;
        const q = parseFloat(String(quantity).replace(',', '.'));
        const c = parseFloat(String(cost_price).replace(',', '.'));
        const s = parseFloat(String(sale_price).replace(',', '.'));
        const row = {
          barcode: barcode || '',
          name: name || '',
          quantity: isNaN(q) ? '' : String(q),
          cost_price: isNaN(c) ? '' : String(c.toFixed(2)),
          sale_price: isNaN(s) ? '' : String(s.toFixed(2)),
        };
        const rowErr = [];
        if (!row.barcode) rowErr.push('Código');
        if (!row.name) rowErr.push('Nome');
        if (isNaN(q) || q <= 0) rowErr.push('Qtd');
        if (isNaN(c) || c < 0) rowErr.push('Custo');
        if (isNaN(s) || s <= 0) rowErr.push('Venda');
        if (rowErr.length) errs.push(`Linha ${i + 1}: ${rowErr.join(', ')}`);
        parsed.push(row);
      }
      setBatchProducts(parsed);
      setBatchErrors(errs);
      recomputeTotals(parsed);
      showToast('success', `Colados ${parsed.length} itens`);
    } catch (e) {
      setBatchErrors([`Falha ao colar dados: ${e.message}`]);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      handlePasteToBatch(text);
    } catch (e) {
      setBatchErrors(['Não foi possível ler da área de transferência.']);
    }
  };

  const handleQuickEntryChange = (field, value) => {
    const next = { ...quickEntry, [field]: value };
    // Mantém os preços sempre sincronizados para evitar inconsistências
    if (field === 'cost_price' || field === 'markup') {
      const c = parseFloat(String(next.cost_price).replace(',', '.'));
      const m = parseFloat(next.markup);
      if (!isNaN(c) && !isNaN(m)) {
        next.sale_price = String((c * (1 + m / 100)).toFixed(2));
      }
    } else if (field === 'sale_price') {
      // Atualiza o percentual quando a venda é alterada manualmente
      const c = parseFloat(String(next.cost_price).replace(',', '.'));
      const s = parseFloat(String(next.sale_price).replace(',', '.'));
      if (!isNaN(c) && !isNaN(s) && c > 0) {
        next.markup = String(((s - c) / c * 100).toFixed(2));
      }
    }

    // Sugestões ao digitar código ou nome
    if (field === 'barcode' || field === 'name') {
      const q = String(value || '').toLowerCase();
      if (q.length >= 3) {
        const list = products
          .filter(p => (
            (p.barcode && String(p.barcode).toLowerCase().startsWith(q)) ||
            (p.name && p.name.toLowerCase().includes(q))
          ))
          .sort((a, b) => compareByRelevance(a, b, q))
          .slice(0, 8);
        setSuggestions(list);
        setShowSuggestions(list.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }

      // Se código bater exatamente, preenche os campos
      if (field === 'barcode') {
        const match = products.find(p => String(p.barcode) === String(value));
        if (match) {
          next.name = match.name || next.name;
          const c = typeof match.cost_price !== 'undefined' ? match.cost_price : match.last_purchase_value;
          if (typeof c !== 'undefined' && c !== null) next.cost_price = String(Number(c).toFixed(2));
          if (typeof match.sale_price !== 'undefined' && match.sale_price !== null) next.sale_price = String(Number(match.sale_price).toFixed(2));
        }
      }
    }

    setQuickEntry(next);
  };

  // Adicionar item do topo (Quick Add) à lista em lote
  const handleQuickAddToBatch = () => {
    const q = parseFloat(quickEntry.quantity);
    let c = parseFloat(String(quickEntry.cost_price || '0.01').replace(',', '.'));
    let s = parseFloat(String(quickEntry.sale_price || '1.00').replace(',', '.'));
    
    // Validação básica obrigatória
    if (!quickEntry.barcode || !quickEntry.name || isNaN(q) || q <= 0) {
      showToast('error', 'Preencha código, nome e quantidade válida.');
      return;
    }
    
    // Aplicar valores padrão se não informados ou inválidos
    if (isNaN(c) || c < 0) c = 0.01;
    if (isNaN(s) || s <= 0) s = 1.00;
    if (s < c) s = c + 0.01; // Garantir margem mínima
    
    const next = [...batchProducts, {
      barcode: quickEntry.barcode,
      name: quickEntry.name,
      quantity: String(q),
      cost_price: String(c.toFixed(2)),
      sale_price: String(s.toFixed(2))
    }];
    setBatchProducts(next);
    recomputeTotals(next);
    setQuickEntry({ barcode: '', name: '', quantity: '', cost_price: '', markup: '', sale_price: '' });
    setSuggestions([]);
    setShowSuggestions(false);
    showToast('success', 'Item adicionado à lista');
  };

  // Atalhos de teclado dentro do modal de entrada
  useEffect(() => {
    if (!showEntryModal) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowEntryModal(false);
      } else if (e.key === 'Enter') {
        if (simpleMode && e.ctrlKey) {
          handleBatchSubmit();
        } else if (simpleMode) {
          handleSimpleAdd();
        } else if (e.ctrlKey) {
          handleBatchSubmit();
        } else {
          handleQuickAddToBatch();
        }
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showEntryModal, quickEntry, batchProducts, simpleMode]);

  // Entrada simplificada: permite adicionar novos produtos ou atualizar existentes
  const handleSimpleAdd = async () => {
    const q = parseFloat(quickEntry.quantity);
    if (!quickEntry.barcode || isNaN(q) || q <= 0) {
      showToast('error', 'Informe código e quantidade.');
      return;
    }

    // Busca produto existente
    const { data: existing, error: findErr } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', quickEntry.barcode)
      .eq('user_id', userId)
      .limit(1);

    if (findErr) {
      showToast('error', `Erro ao buscar produto: ${findErr.message}`);
      return;
    }

    if (existing && existing.length > 0) {
      // Produto existe: atualiza estoque
      const current = existing[0];
      const newQty = Number(current.quantity || 0) + q;
      const { error: upErr } = await supabase
        .from('products')
        .update({ quantity: newQty })
        .eq('id', current.id)
        .eq('user_id', userId);

      if (upErr) {
        showToast('error', `Erro ao atualizar estoque: ${upErr.message}`);
        return;
      }

      fetchProducts();
      setQuickEntry({ barcode: '', name: '', quantity: '', cost_price: '', markup: '', sale_price: '' });
      setSuggestions([]);
      setShowSuggestions(false);
      showToast('success', 'Estoque atualizado com sucesso!');
    } else {
      // Produto não existe: precisa de mais informações para criar
      if (!quickEntry.name) {
        showToast('error', 'Para novos produtos, informe também o nome.');
        return;
      }

      // Valores padrão para novos produtos
      const defaultCost = 0.01; // Custo mínimo
      const defaultSale = 1.00; // Preço de venda padrão
      
      // Cria novo produto
      const payload = {
        barcode: quickEntry.barcode,
        name: quickEntry.name,
        quantity: q,
        cost_price: defaultCost,
        sale_price: defaultSale,
        user_id: userId,
      };

      const { error } = await supabase.from('products').insert([payload]);
      if (error) {
        // Fallback para schema antigo
        if (/cost_price/i.test(error.message)) {
          const legacyPayload = {
            barcode: quickEntry.barcode,
            name: quickEntry.name,
            quantity: q,
            last_purchase_value: defaultCost,
            sale_price: defaultSale,
            user_id: userId,
          };
          const { error: legacyError } = await supabase.from('products').insert([legacyPayload]);
          if (legacyError) {
            showToast('error', `Erro ao criar produto: ${legacyError.message}`);
            return;
          }
        } else {
          showToast('error', `Erro ao criar produto: ${error.message}`);
          return;
        }
      }

      fetchProducts();
      setQuickEntry({ barcode: '', name: '', quantity: '', cost_price: '', markup: '', sale_price: '' });
      setSuggestions([]);
      setShowSuggestions(false);
      showToast('success', 'Novo produto criado com sucesso! Lembre-se de definir os preços corretos.');
    }
  };

  const handleRemoveSimpleItem = (index) => {
    setSimpleList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSimpleProcess = async () => {
    if (!simpleList.length) {
      showToast('error', 'Adicione itens antes de processar.');
      return;
    }
    // Consolida por código
    const map = new Map();
    simpleList.forEach(item => {
      const key = String(item.barcode);
      const qty = Number(item.quantity) || 0;
      if (!map.has(key)) map.set(key, { barcode: key, quantity: 0 });
      map.get(key).quantity += qty;
    });

    const consolidated = Array.from(map.values());
    const errors = [];
    for (const it of consolidated) {
      const { data: existing, error: findErr } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', it.barcode)
        .eq('user_id', userId)
        .limit(1);
      if (findErr) { errors.push(`Erro ao buscar ${it.barcode}: ${findErr.message}`); continue; }
      if (!existing || existing.length === 0) { errors.push(`Código não cadastrado: ${it.barcode}`); continue; }
      const current = existing[0];
      const newQty = Number(current.quantity || 0) + Number(it.quantity || 0);
      const { error: upErr } = await supabase
        .from('products')
        .update({ quantity: newQty })
        .eq('id', current.id)
        .eq('user_id', userId);
      if (upErr) { errors.push(`Erro ao atualizar ${it.barcode}: ${upErr.message}`); }
    }

    if (errors.length) {
      setBatchErrors(errors);
      showToast('error', 'Alguns itens não foram processados.');
    } else {
      showToast('success', 'Entrada processada!');
      setBatchErrors([]);
      setShowEntryModal(false);
      setSimpleList([]);
      fetchProducts();
    }
  };

  const handleQuickEntrySubmit = async () => {
    const q = parseFloat(quickEntry.quantity);
    let c = parseFloat(String(quickEntry.cost_price || '0.01').replace(',', '.'));
    let s = parseFloat(String(quickEntry.sale_price || '1.00').replace(',', '.'));
    
    // Validação básica obrigatória
    if (!quickEntry.barcode || !quickEntry.name || isNaN(q) || q <= 0) {
      showToast('error', 'Preencha código, nome e quantidade válida.');
      return;
    }
    
    // Aplicar valores padrão se não informados ou inválidos
    if (isNaN(c) || c < 0) c = 0.01;
    if (isNaN(s) || s <= 0) s = 1.00;
    if (s < c) s = c + 0.01; // Garantir margem mínima

    // Verifica se já existe produto com o mesmo código
    const { data: existing, error: findErr } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', quickEntry.barcode)
      .eq('user_id', userId)
      .limit(1);

    if (findErr) {
      showToast('error', `Erro ao buscar produto: ${findErr.message}`);
      return;
    }

    if (existing && existing.length > 0) {
      const current = existing[0];
      const newQty = Number(current.quantity || 0) + q;
      // Atualiza quantidade e opcionalmente preços
      let updatePayload = { quantity: newQty };
      if (!isNaN(c)) updatePayload.cost_price = c;
      if (!isNaN(s)) updatePayload.sale_price = s;

      const { error: upErr } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', current.id)
        .eq('user_id', userId);

      if (upErr) {
        if (/cost_price/i.test(upErr.message)) {
          // Fallback para schema antigo
          updatePayload = { quantity: newQty };
          if (!isNaN(c)) updatePayload.last_purchase_value = c;
          if (!isNaN(s)) updatePayload.sale_price = s;
          const { error: legacyUpErr } = await supabase
            .from('products')
            .update(updatePayload)
            .eq('id', current.id)
            .eq('user_id', userId);
          if (legacyUpErr) {
            showToast('error', `Erro ao atualizar estoque: ${legacyUpErr.message}`);
            return;
          }
        } else {
          showToast('error', `Erro ao atualizar estoque: ${upErr.message}`);
          return;
        }
      }
      fetchProducts();
      setShowQuickEntryModal(false);
      setQuickEntry({ barcode: '', name: '', quantity: '', cost_price: '', markup: '', sale_price: '' });
      setSuggestions([]);
      setShowSuggestions(false);
      showToast('success', 'Estoque atualizado com sucesso!');
      return;
    }

    // Não existe: inserir
    const payload = {
      barcode: quickEntry.barcode,
      name: quickEntry.name,
      quantity: q,
      cost_price: c,
      sale_price: s,
      user_id: userId,
    };
    const { error } = await supabase.from('products').insert([payload]);
    if (error) {
      if (/cost_price/i.test(error.message)) {
        const legacyPayload = {
          barcode: quickEntry.barcode,
          name: quickEntry.name,
          quantity: q,
          last_purchase_value: c,
          sale_price: s,
          user_id: userId,
        };
        const { error: legacyError } = await supabase.from('products').insert([legacyPayload]);
        if (legacyError) {
          setShowQuickEntryModal(false);
          showToast('error', `Erro: ${legacyError.message}`);
          return;
        }
      } else {
        setShowQuickEntryModal(false);
        showToast('error', `Erro: ${error.message}`);
        return;
      }
    }
    fetchProducts();
    setShowQuickEntryModal(false);
    setQuickEntry({ barcode: '', name: '', quantity: '', cost_price: '', markup: '', sale_price: '' });
    setSuggestions([]);
    setShowSuggestions(false);
    showToast('success', 'Entrada rápida adicionada!');
  };

  const handleAddBatchRow = () => {
    const next = [...batchProducts, { barcode: '', name: '', quantity: '', cost_price: '', sale_price: '' }];
    setBatchProducts(next);
    recomputeTotals(next);
  };

  const handleRemoveBatchRow = (index) => {
    const newBatchProducts = [...batchProducts];
    newBatchProducts.splice(index, 1);
    setBatchProducts(newBatchProducts);
    recomputeTotals(newBatchProducts);
  };

  const handleBatchInputChange = (index, field, value) => {
    const newBatchProducts = [...batchProducts];
    newBatchProducts[index][field] = value;
    // Auto-preenchimento ao inserir barcode existente
    if (field === 'barcode') {
      const match = products.find(p => String(p.barcode) === String(value));
      if (match) {
        newBatchProducts[index].name = match.name || newBatchProducts[index].name;
        const c = typeof match.cost_price !== 'undefined' ? match.cost_price : match.last_purchase_value;
        if (typeof c !== 'undefined' && c !== null) newBatchProducts[index].cost_price = String(Number(c).toFixed(2));
        if (typeof match.sale_price !== 'undefined' && match.sale_price !== null) newBatchProducts[index].sale_price = String(Number(match.sale_price).toFixed(2));
      }
    }
    // validação por linha
    const row = newBatchProducts[index];
    const q = parseFloat(row.quantity);
    const c = parseFloat(String(row.cost_price).replace(',', '.'));
    const s = parseFloat(String(row.sale_price).replace(',', '.'));
    const errs = [];
    if (!row.barcode) errs.push('Código obrigatório');
    if (!row.name) errs.push('Nome obrigatório');
    if (isNaN(q) || q <= 0) errs.push('Qtd inválida');
    if (isNaN(c) || c < 0) errs.push('Custo inválido');
    if (isNaN(s) || s <= 0) errs.push('Venda inválida');
    if (!isNaN(c) && !isNaN(s) && s < c) errs.push('Venda abaixo do custo');
    setRowErrors((prev) => ({ ...prev, [index]: errs }));
    setBatchProducts(newBatchProducts);
    recomputeTotals(newBatchProducts);
  };

  const handleBatchSubmit = async () => {
    // Validar dados
    const validProducts = batchProducts
      .map((product, idx) => ({ product, idx }))
      .filter(({ product }) => {
        const quantity = parseFloat(product.quantity);
        const cost = parseFloat(String(product.cost_price).replace(',', '.'));
        const sale = parseFloat(String(product.sale_price).replace(',', '.'));
        return (
          product.barcode && product.name && !isNaN(quantity) && quantity > 0 &&
          !isNaN(cost) && cost >= 0 && !isNaN(sale) && sale > 0 && sale >= cost
        );
      })
      .map(({ product }) => product);

    if (validProducts.length === 0) {
      setBatchErrors(['Preencha pelo menos um produto corretamente (código, nome, quantidade, custo e venda).']);
      return;
    }

    // Consolidar duplicados por barcode somando quantidades e mantendo preços mais recentes
    const mergedByBarcode = new Map();
    for (const row of validProducts) {
      const key = String(row.barcode);
      const existing = mergedByBarcode.get(key);
      if (existing) {
        const qty = (parseFloat(existing.quantity) || 0) + (parseFloat(row.quantity) || 0);
        const cost = row.cost_price !== '' ? row.cost_price : existing.cost_price;
        const sale = row.sale_price !== '' ? row.sale_price : existing.sale_price;
        mergedByBarcode.set(key, { ...existing, quantity: String(qty), cost_price: cost, sale_price: sale });
      } else {
        mergedByBarcode.set(key, { ...row });
      }
    }
    const validConsolidated = Array.from(mergedByBarcode.values());

    // Dividir entre existentes e novos usando lista em memória
    const existingByBarcode = new Map(products.map(p => [String(p.barcode), p]));
    let toInsert = [];
    const toUpdate = [];
    for (const product of validConsolidated) {
      const entry = {
        barcode: product.barcode,
        name: product.name,
        quantity: parseFloat(product.quantity),
        cost_price: parseFloat(String(product.cost_price).replace(',', '.')),
        sale_price: parseFloat(String(product.sale_price).replace(',', '.'))
      };
      const existing = existingByBarcode.get(String(product.barcode));
      if (existing) {
        toUpdate.push({ existing, entry });
      } else {
        toInsert.push(entry);
      }
    }

    const updateErrors = [];
    for (const { existing, entry } of toUpdate) {
      const newQty = Number(existing.quantity || 0) + entry.quantity;
      let updatePayload = { quantity: newQty };
      if (!isNaN(entry.cost_price)) updatePayload.cost_price = entry.cost_price;
      if (!isNaN(entry.sale_price)) updatePayload.sale_price = entry.sale_price;
      const { error: upErr } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', existing.id)
        .eq('user_id', userId);
      if (upErr) {
        if (/cost_price/i.test(upErr.message)) {
          updatePayload = { quantity: newQty };
          if (!isNaN(entry.cost_price)) updatePayload.last_purchase_value = entry.cost_price;
          if (!isNaN(entry.sale_price)) updatePayload.sale_price = entry.sale_price;
          const { error: legacyUpErr } = await supabase
            .from('products')
            .update(updatePayload)
            .eq('id', existing.id)
            .eq('user_id', userId);
          if (legacyUpErr) updateErrors.push(legacyUpErr.message);
        } else {
          updateErrors.push(upErr.message);
        }
      }
    }

    // Inserir novos (com fallback para last_purchase_value)
    if (toInsert.length > 0) {
      // Verifica duplicidade no banco e transforma em update quando necessário
      try {
        const barcodes = toInsert.map(p => String(p.barcode));
        const { data: existDb, error: existErr } = await supabase
          .from('products')
          .select('id, barcode, quantity, cost_price, last_purchase_value, sale_price')
          .in('barcode', barcodes)
          .eq('user_id', userId);
        if (!existErr && existDb && existDb.length) {
          const exMap = new Map(existDb.map(r => [String(r.barcode), r]));
          const stillInsert = [];
          for (const p of toInsert) {
            const ex = exMap.get(String(p.barcode));
            if (ex) {
              const newQty = Number(ex.quantity || 0) + p.quantity;
              let updatePayload = { quantity: newQty };
              if (!isNaN(p.cost_price)) updatePayload.cost_price = p.cost_price;
              if (!isNaN(p.sale_price)) updatePayload.sale_price = p.sale_price;
              const { error: upErr2 } = await supabase
                .from('products')
                .update(updatePayload)
                .eq('id', ex.id)
                .eq('user_id', userId);
              if (upErr2) {
                if (/cost_price/i.test(upErr2.message)) {
                  updatePayload = { quantity: newQty };
                  if (!isNaN(p.cost_price)) updatePayload.last_purchase_value = p.cost_price;
                  if (!isNaN(p.sale_price)) updatePayload.sale_price = p.sale_price;
                  const { error: legacyUpErr2 } = await supabase
                    .from('products')
                    .update(updatePayload)
                    .eq('id', ex.id)
                    .eq('user_id', userId);
                  if (legacyUpErr2) updateErrors.push(legacyUpErr2.message);
                } else {
                  updateErrors.push(upErr2.message);
                }
              }
            } else {
              stillInsert.push(p);
            }
          }
          toInsert = stillInsert;
        }
      } catch (e) {
        console.warn('Falha ao verificar duplicidade antes do insert:', e?.message || e);
      }
      const toInsertWithUser = toInsert.map(p => ({ ...p, user_id: userId }));
      const { error } = await supabase
        .from('products')
        .insert(toInsertWithUser);
      if (error) {
        if (/cost_price/i.test(error.message)) {
          const legacyToInsert = toInsertWithUser.map(p => ({
            barcode: p.barcode,
            name: p.name,
            quantity: p.quantity,
            last_purchase_value: p.cost_price,
            sale_price: p.sale_price,
            user_id: p.user_id
          }));
          const { error: legacyError } = await supabase
            .from('products')
            .insert(legacyToInsert);
          if (legacyError) {
            updateErrors.push(legacyError.message);
          }
        } else {
          updateErrors.push(error.message);
        }
      }
    }

    if (updateErrors.length) {
      setBatchErrors(updateErrors.map((m, i) => `Erro ${i + 1}: ${m}`));
      showToast('error', 'Alguns itens não foram processados. Veja os erros.');
    } else {
      showToast('success', 'Entrada processada com sucesso!');
      setBatchErrors([]);
      setShowEntryModal(false);
      setBatchProducts([{ barcode: '', name: '', quantity: '', cost_price: '', sale_price: '' }]);
      fetchProducts();
    }
  };

  // Importação CSV para Entrada em Lote
  const handleCSVUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result;
        const lines = text.trim().split(/\r?\n/);
        if (lines.length < 2) {
          setBatchErrors(['Arquivo CSV vazio ou sem cabeçalho.']);
          return;
        }
        // Detectar separador: vírgula ou ponto-e-vírgula
        const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
        const header = lines[0].split(sep).map((h) => h.trim().toLowerCase());
        const requiredBase = ['barcode','name','quantity','sale_price'];
        const hasCost = header.includes('cost_price') || header.includes('last_purchase_value');
        const missingBase = requiredBase.filter((r) => !header.includes(r));
        const missing = [...missingBase, ...(hasCost ? [] : ['cost_price/last_purchase_value'])];
        if (missing.length) {
          setBatchErrors([`Cabeçalho inválido. Faltam colunas: ${missing.join(', ')}`]);
          return;
        }
        const costHeaderName = header.includes('cost_price') ? 'cost_price' : 'last_purchase_value';
        const idx = {
          barcode: header.indexOf('barcode'),
          name: header.indexOf('name'),
          quantity: header.indexOf('quantity'),
          cost_price: header.indexOf(costHeaderName),
          sale_price: header.indexOf('sale_price'),
        };
        const parsed = [];
        const rowErrors = [];
        for (let i = 1; i < lines.length; i++) {
          const raw = lines[i];
          if (!raw.trim()) continue;
          const cols = raw.split(sep);
          const item = {
            barcode: (cols[idx.barcode] || '').trim(),
            name: (cols[idx.name] || '').trim(),
            quantity: (cols[idx.quantity] || '').trim(),
            cost_price: (cols[idx.cost_price] || '').trim(),
            sale_price: (cols[idx.sale_price] || '').trim(),
          };
          // validações
          // Converter vírgula decimal para ponto
          const toNumber = (s) => parseFloat(String(s).replace(',', '.'));
          const numQty = toNumber(item.quantity);
          const numCost = toNumber(item.cost_price);
          const numSale = toNumber(item.sale_price);
          const errs = [];
          if (!item.barcode) errs.push('código');
          if (!item.name) errs.push('nome');
          if (isNaN(numQty) || numQty <= 0) errs.push('quantidade');
          if (isNaN(numCost) || numCost < 0) errs.push('custo');
          if (isNaN(numSale) || numSale <= 0) errs.push('venda');
          if (errs.length) {
            rowErrors.push(`Linha ${i+1}: campos inválidos (${errs.join(', ')})`);
            continue;
          }
          parsed.push({
            barcode: item.barcode,
            name: item.name,
            quantity: String(numQty),
            cost_price: String(numCost.toFixed(2)),
            sale_price: String(numSale.toFixed(2)),
          });
        }
        if (parsed.length === 0) {
          setBatchErrors(rowErrors.length ? rowErrors : ['Nenhuma linha válida encontrada.']);
          return;
        }
        setBatchErrors(rowErrors);
        setBatchProducts(parsed);
        recomputeTotals(parsed);
      } catch (e) {
        setBatchErrors([`Falha ao ler CSV: ${e.message}`]);
      }
    };
    reader.onerror = () => {
      setBatchErrors(['Não foi possível ler o arquivo CSV.']);
    };
    reader.readAsText(file);
  };

  return (
    <>
      <div className="dashboard-container">
        {/* Overlay para mobile */}
        <div 
          className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
          onClick={closeSidebar}
        ></div>
        
        <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="logo">
              {companySettings.logo ? (
                <img src={companySettings.logo} alt="Logo" className="company-logo" />
              ) : (
                <span className="logo-icon"><i className="fas fa-box"></i></span>
              )}
              <span>{companySettings.name}</span>
            </div>
        </div>
        <div className="sidebar-content">
          <ul className="nav-menu">
            <li className="nav-item">
              <a href="#" className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleTabChange('dashboard'); handleMobileNavClick(); }}>
                <span className="nav-icon"><i className="fas fa-chart-bar"></i></span>
                <span>Dashboard</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" className={`nav-link ${activeTab === 'produtos' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleTabChange('produtos'); handleMobileNavClick(); }}>
                <span className="nav-icon"><i className="fas fa-boxes"></i></span>
                <span>Produtos</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" className={`nav-link ${activeTab === 'vendas' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleTabChange('vendas'); handleMobileNavClick(); }}>
                <span className="nav-icon"><i className="fas fa-cash-register"></i></span>
                <span>Vendas</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" className={`nav-link ${activeTab === 'historico' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleTabChange('historico'); handleMobileNavClick(); }}>
                <span className="nav-icon"><i className="fas fa-chart-line"></i></span>
                <span>Histórico</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" className={`nav-link ${activeTab === 'custos' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleTabChange('custos'); handleMobileNavClick(); }}>
                <span className="nav-icon"><i className="fas fa-calculator"></i></span>
                <span>Cálculo de Custos</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" className={`nav-link ${activeTab === 'configuracoes' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleTabChange('configuracoes'); handleMobileNavClick(); }}>
                <span className="nav-icon"><i className="fas fa-cog"></i></span>
                <span>Configurações</span>
              </a>
            </li>
          </ul>
        </div>
        <div className="sidebar-footer">
          <button className="btn-outline" onClick={handleLogout}>
            <span className="icon"><i className="fas fa-sign-out-alt"></i></span>
            Sair
          </button>
        </div>
      </div>

  <div className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="dashboard-header">
        <div className="header-content">
          <button 
            className={`menu-toggle ${sidebarOpen ? 'active' : ''}`}
            onClick={toggleSidebar}
            aria-label="Alternar menu lateral"
            aria-expanded={sidebarOpen}
          >
            <i className="fas fa-bars"></i>
          </button>
        </div>
      </div>

      <div className="dashboard-content">
          {activeTab === 'dashboard' && (
            <>
              <div className="sales-summary">
                <h2>Resumo de Vendas</h2>
                <div className="sales-stats">
                  <div className="stat-card" onClick={() => handleTabChange('historico')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon">
                      <i className="fas fa-money-bill-wave"></i>
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Total de Vendas</div>
                      <div className="stat-value">{formatCurrency(totalSales)}</div>
                    </div>
                  </div>
                  <div className="stat-card" onClick={() => handleTabChange('produtos')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon">
                      <i className="fas fa-boxes"></i>
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Total de Produtos</div>
                      <div className="stat-value">{totalProducts}</div>
                    </div>
                  </div>
                  <div className="stat-card" onClick={() => handleTabChange('produtos')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon">
                      <i className="fas fa-exclamation-triangle"></i>
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Estoque Baixo</div>
                      <div className="stat-value">{lowStockCount}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista de produtos removida do Dashboard; use a aba Produtos */}
            </>
          )}

          {activeTab === 'produtos' && (
            <div className="produtos-page">
              <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2><i className="fas fa-boxes"></i> Gerenciar Produtos</h2>
                <button 
                  className="btn-primary" 
                  onClick={() => setShowEntryModal(true)}
                  aria-label="Abrir modal para adicionar novo produto"
                >
                  <i className="fas fa-plus"></i>
                  Adicionar Produto
                </button>
              </div>
              
              <div className="products-section card">
                <div className="products-filters">
                  <div className="basic-filters" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                      <label htmlFor="productSearch">Buscar Produto</label>
                      <input
                        id="productSearch"
                        type="text"
                        className="form-input"
                        placeholder="Pesquisar por nome ou código de barras"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        aria-describedby="productSearchDesc"
                      />
                    </div>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'end' }}>
                      <button 
                        className={`btn-outline ${showAdvancedFilters ? 'active' : ''}`}
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        aria-label="Alternar filtros avançados"
                      >
                        <i className="fas fa-filter"></i>
                        Filtros Avançados
                      </button>
                    </div>
                  </div>

                  {showAdvancedFilters && (
                    <div className="advanced-filters card" style={{ padding: '1rem', marginBottom: '1rem', background: 'var(--surface-color)', border: '1px solid var(--border-color)' }}>
                      <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>
                        <i className="fas fa-sliders-h"></i> Filtros Avançados
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div className="form-group">
                          <label htmlFor="minPrice">Preço Mínimo</label>
                          <input
                            id="minPrice"
                            type="number"
                            step="0.01"
                            className="form-input"
                            placeholder="R$ 0,00"
                            value={filters.minPrice}
                            onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="maxPrice">Preço Máximo</label>
                          <input
                            id="maxPrice"
                            type="number"
                            step="0.01"
                            className="form-input"
                            placeholder="R$ 999,99"
                            value={filters.maxPrice}
                            onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="minStock">Estoque Mínimo</label>
                          <input
                            id="minStock"
                            type="number"
                            className="form-input"
                            placeholder="0"
                            value={filters.minStock}
                            onChange={(e) => setFilters(prev => ({ ...prev, minStock: e.target.value }))}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="maxStock">Estoque Máximo</label>
                          <input
                            id="maxStock"
                            type="number"
                            className="form-input"
                            placeholder="999"
                            value={filters.maxStock}
                            onChange={(e) => setFilters(prev => ({ ...prev, maxStock: e.target.value }))}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="stockStatus">Status do Estoque</label>
                          <select
                            id="stockStatus"
                            className="form-input"
                            value={filters.stockStatus}
                            onChange={(e) => setFilters(prev => ({ ...prev, stockStatus: e.target.value }))}
                          >
                            <option value="">Todos</option>
                            <option value="low">Baixo (&lt; 10)</option>
                            <option value="normal">Normal (10-49)</option>
                            <option value="high">Alto (≥ 50)</option>
                          </select>
                        </div>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'end', gap: '0.5rem' }}>
                          <button 
                            className="btn-outline"
                            onClick={() => setFilters({
                              category: '',
                              minPrice: '',
                              maxPrice: '',
                              stockStatus: '',
                              minStock: '',
                              maxStock: ''
                            })}
                            aria-label="Limpar todos os filtros"
                          >
                            <i className="fas fa-times"></i>
                            Limpar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="products-table-container">
                  <div className="table-responsive">
                    <table 
                      className="products-table"
                      role="table"
                      aria-label="Tabela de produtos cadastrados"
                      style={{
                        width: '100% !important',
                        borderCollapse: 'collapse !important',
                        backgroundColor: '#ffffff !important',
                        border: '1px solid #e5e7eb !important',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06) !important'
                      }}
                    >
                      <thead>
                        <tr role="row" style={{
                          backgroundColor: '#ffffff !important',
                          borderBottom: '1px solid #e5e7eb !important'
                        }}>
                          <th role="columnheader" style={{
                            padding: '12px 16px !important',
                            textAlign: 'left !important',
                            fontWeight: '600 !important',
                            fontSize: '0.875rem !important',
                            textTransform: 'uppercase !important',
                            letterSpacing: '0.05em !important',
                            border: '1px solid #e5e7eb !important',
                            color: '#111827 !important',
                            backgroundColor: '#ffffff !important'
                          }}>Código de Barras</th>
                          <th role="columnheader" style={{
                            padding: '12px 16px !important',
                            textAlign: 'left !important',
                            fontWeight: '600 !important',
                            fontSize: '0.875rem !important',
                            textTransform: 'uppercase !important',
                            letterSpacing: '0.05em !important',
                            border: '1px solid #e5e7eb !important',
                            color: '#111827 !important',
                            backgroundColor: '#ffffff !important'
                          }}>Nome do Produto</th>
                          <th role="columnheader" style={{
                            padding: '12px 16px !important',
                            textAlign: 'left !important',
                            fontWeight: '600 !important',
                            fontSize: '0.875rem !important',
                            textTransform: 'uppercase !important',
                            letterSpacing: '0.05em !important',
                            border: '1px solid #e5e7eb !important',
                            color: '#111827 !important',
                            backgroundColor: '#ffffff !important'
                          }}>Quantidade em Estoque</th>
                          <th role="columnheader" style={{
                            padding: '12px 16px !important',
                            textAlign: 'left !important',
                            fontWeight: '600 !important',
                            fontSize: '0.875rem !important',
                            textTransform: 'uppercase !important',
                            letterSpacing: '0.05em !important',
                            border: '1px solid #e5e7eb !important',
                            color: '#111827 !important',
                            backgroundColor: '#ffffff !important'
                          }}>Preço de Custo</th>
                          <th role="columnheader" style={{
                            padding: '12px 16px !important',
                            textAlign: 'left !important',
                            fontWeight: '600 !important',
                            fontSize: '0.875rem !important',
                            textTransform: 'uppercase !important',
                            letterSpacing: '0.05em !important',
                            border: '1px solid #e5e7eb !important',
                            color: '#111827 !important',
                            backgroundColor: '#ffffff !important'
                          }}>Preço de Venda</th>
                          <th role="columnheader" style={{
                            padding: '12px 16px !important',
                            textAlign: 'left !important',
                            fontWeight: '600 !important',
                            fontSize: '0.875rem !important',
                            textTransform: 'uppercase !important',
                            letterSpacing: '0.05em !important',
                            border: '1px solid #e5e7eb !important',
                            color: '#111827 !important',
                            backgroundColor: '#ffffff !important'
                          }}>Status</th>
                          <th role="columnheader" style={{
                            padding: '12px 16px !important',
                            textAlign: 'left !important',
                            fontWeight: '600 !important',
                            fontSize: '0.875rem !important',
                            textTransform: 'uppercase !important',
                            letterSpacing: '0.05em !important',
                            border: '1px solid #e5e7eb !important',
                            color: '#111827 !important',
                            backgroundColor: '#ffffff !important'
                          }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map((product, index) => (
                            <tr key={product.id} role="row" style={{
                              backgroundColor: `${index % 2 === 0 ? '#ffffff' : '#f9fafb'} !important`,
                              borderBottom: '1px solid #e5e7eb !important',
                              transition: 'background-color 0.2s ease !important'
                            }}
                            onMouseEnter={(e) => e.target.closest('tr').style.backgroundColor = '#f3f4f6'}
                            onMouseLeave={(e) => e.target.closest('tr').style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f9fafb'}
                            >
                              <td role="cell" style={{
                                padding: '12px 16px !important',
                                border: '1px solid #e5e7eb !important',
                                color: '#111827 !important',
                                fontSize: '0.875rem !important',
                                backgroundColor: 'transparent !important'
                              }}>{product.barcode}</td>
                              <td role="cell" style={{
                                padding: '12px 16px !important',
                                border: '1px solid #e5e7eb !important',
                                color: '#111827 !important',
                                fontSize: '0.875rem !important',
                                fontWeight: '500 !important',
                                backgroundColor: 'transparent !important'
                              }}>{product.name}</td>
                              <td role="cell" style={{
                                padding: '12px 16px !important',
                                border: '1px solid #e5e7eb !important',
                                color: '#111827 !important',
                                fontSize: '0.875rem !important',
                                backgroundColor: 'transparent !important'
                              }}>
                                <span className={`quantity-badge ${product.quantity < 10 ? 'low-stock' : ''}`}>
                                  {product.quantity}
                                </span>
                              </td>
                              <td role="cell" style={{
                                padding: '12px 16px !important',
                                border: '1px solid #e5e7eb !important',
                                color: '#111827 !important',
                                fontSize: '0.875rem !important',
                                fontWeight: '500 !important',
                                backgroundColor: 'transparent !important'
                              }}>{formatCurrency(getCost(product))}</td>
                              <td role="cell" style={{
                                padding: '12px 16px !important',
                                border: '1px solid #e5e7eb !important',
                                color: '#111827 !important',
                                fontSize: '0.875rem !important',
                                fontWeight: '500 !important',
                                backgroundColor: 'transparent !important'
                              }}>{formatCurrency(product.sale_price)}</td>
                              <td role="cell" style={{
                                padding: '12px 16px !important',
                                border: '1px solid #e5e7eb !important',
                                color: '#111827 !important',
                                fontSize: '0.875rem !important',
                                backgroundColor: 'transparent !important'
                              }}>
                                <span className={`status-badge ${product.quantity < 10 ? 'warning' : 'success'}`}>
                                  {product.quantity < 10 ? 'Estoque Baixo' : 'Em Estoque'}
                                </span>
                              </td>
                              <td className="actions-cell" role="cell" style={{
                                padding: '12px 16px !important',
                                border: '1px solid #e5e7eb !important',
                                color: '#111827 !important',
                                fontSize: '0.875rem !important',
                                backgroundColor: 'transparent !important'
                              }}>
                                <button
                                  className="btn-action edit"
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setShowQuantityModal(true);
                                  }}
                                  title="Ajustar Quantidade"
                                  aria-label={`Ajustar quantidade do produto ${product.name}`}
                                  style={{
                                    backgroundColor: '#ffffff !important',
                                    color: '#6b7280 !important',
                                    border: '1px solid #e5e7eb !important',
                                    borderRadius: '6px !important',
                                    padding: '6px 8px !important',
                                    marginRight: '4px !important',
                                    cursor: 'pointer !important',
                                    fontSize: '0.75rem !important',
                                    transition: 'all 0.2s ease !important',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06) !important'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = '#f9fafb';
                                    e.target.style.color = '#111827';
                                    e.target.style.borderColor = '#d1d5db';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = '#ffffff';
                                    e.target.style.color = '#6b7280';
                                    e.target.style.borderColor = '#e5e7eb';
                                  }}
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button
                                  className="btn-action edit"
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setShowPriceModal(true);
                                  }}
                                  title="Editar Custos e Preços"
                                  aria-label={`Editar custos e preços do produto ${product.name}`}
                                  style={{
                                    backgroundColor: '#ffffff !important',
                                    color: '#6b7280 !important',
                                    border: '1px solid #e5e7eb !important',
                                    borderRadius: '6px !important',
                                    padding: '6px 8px !important',
                                    marginRight: '4px !important',
                                    cursor: 'pointer !important',
                                    fontSize: '0.75rem !important',
                                    transition: 'all 0.2s ease !important',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06) !important'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = '#f9fafb';
                                    e.target.style.color = '#111827';
                                    e.target.style.borderColor = '#d1d5db';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = '#ffffff';
                                    e.target.style.color = '#6b7280';
                                    e.target.style.borderColor = '#e5e7eb';
                                  }}
                                >
                                  <i className="fas fa-dollar-sign"></i>
                                </button>
                                <button
                                  className="btn-action delete"
                                  onClick={() => handleDeleteProduct(product.id)}
                                  title="Excluir Produto"
                                  aria-label={`Excluir produto ${product.name}`}
                                  style={{
                                    backgroundColor: '#ffffff !important',
                                    color: '#ef4444 !important',
                                    border: '1px solid #fecaca !important',
                                    borderRadius: '6px !important',
                                    padding: '6px 8px !important',
                                    cursor: 'pointer !important',
                                    fontSize: '0.75rem !important',
                                    transition: 'all 0.2s ease !important',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06) !important'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = '#fef2f2';
                                    e.target.style.color = '#dc2626';
                                    e.target.style.borderColor = '#fca5a5';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = '#ffffff';
                                    e.target.style.color = '#ef4444';
                                    e.target.style.borderColor = '#fecaca';
                                  }}
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="7" className="no-products" style={{
                              padding: '40px 20px !important',
                              textAlign: 'center !important',
                              color: '#000000 !important',
                              fontSize: '1rem !important',
                              fontWeight: '500 !important',
                              border: '1px solid #000000 !important',
                              backgroundColor: '#ffffff !important'
                            }}>
                              Nenhum produto cadastrado
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Layout de Cards para Mobile */}
                  <div className="products-mobile-cards">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((product) => (
                        <div key={product.id} className="product-card">
                          <div className="product-card-header">
                            <h3 className="product-card-title">{product.name}</h3>
                            <span className="product-card-code">{product.barcode}</span>
                          </div>
                          
                          <div className="product-card-info">
                            <div className="product-info-item">
                              <span className="product-info-label">Quantidade</span>
                              <span className={`product-info-value quantity-badge ${product.quantity < 10 ? 'low-stock' : ''}`}>
                                {product.quantity}
                              </span>
                            </div>
                            
                            <div className="product-info-item">
                              <span className="product-info-label">Status</span>
                              <span className={`product-info-value status-badge ${product.quantity < 10 ? 'warning' : 'success'}`}>
                                {product.quantity < 10 ? 'Estoque Baixo' : 'Em Estoque'}
                              </span>
                            </div>
                            
                            <div className="product-info-item">
                              <span className="product-info-label">Preço de Custo</span>
                              <span className="product-info-value">{formatCurrency(getCost(product))}</span>
                            </div>
                            
                            <div className="product-info-item">
                              <span className="product-info-label">Preço de Venda</span>
                              <span className="product-info-value">{formatCurrency(product.sale_price)}</span>
                            </div>
                          </div>
                          
                          <div className="product-card-actions">
                            <button
                              className="btn btn-outline"
                              onClick={() => {
                                setSelectedProduct(product);
                                setShowQuantityModal(true);
                              }}
                              title="Ajustar Quantidade"
                            >
                              <i className="fas fa-edit"></i> Qtd
                            </button>
                            <button
                              className="btn btn-outline"
                              onClick={() => {
                                setSelectedProduct(product);
                                setShowPriceModal(true);
                              }}
                              title="Editar Preços"
                            >
                              <i className="fas fa-dollar-sign"></i> Preço
                            </button>
                            <button
                              className="btn btn-danger"
                              onClick={() => handleDeleteProduct(product.id)}
                              title="Excluir Produto"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="product-card">
                        <div className="product-card-header">
                          <h3 className="product-card-title">Nenhum produto cadastrado</h3>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vendas' && (
            <div className="vendas-page">
              <div className="page-header">
                <h2><i className="fas fa-cash-register"></i> Registrar Vendas</h2>
              </div>
              <div className="sale-builder card">
                <div className="quick-grid">
                  <div className="quick-block card">
                    <div className="form-group">
                      <label htmlFor="quickSaleSearch">Busca por Nome/Código</label>
                      <input
                        id="quickSaleSearch"
                        type="text"
                        value={saleSearch}
                        onChange={(e) => handleQuickSaleSearchChange(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Digite para ver sugestões e pressione Enter"
                        className="form-input"
                      />
                    </div>
                    <button className="btn-primary" onClick={handleAddBySearch} style={{ alignSelf: 'end' }}>
                      <i className="fas fa-plus"></i>
                      Adicionar
                    </button>
                    {saleSuggestions.length > 0 && (
                      <div className="suggestions-dropdown">
                        {saleSuggestions.map((s, idx) => (
                          <button
                            key={s.id}
                            className={`suggestion-row ${idx === saleSuggestionIndex ? 'active' : ''}`}
                            title={s.name || s.product_name || s.barcode}
                            onClick={() => { addProductToCart(s, 1); setSaleSearch(''); setSaleSuggestions([]); setSaleSuggestionIndex(-1); }}
                          >
                            <div className="sg-name">{renderHighlighted(String(s.name && s.name.trim() ? s.name.trim() : s.product_name && s.product_name.trim() ? s.product_name.trim() : s.barcode ? `Produto ${s.barcode}` : 'Produto sem nome'), saleSearch)}</div>
                            <div className="sg-meta">{formatCurrency(s.sale_price)} • Estoque: {s.quantity}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="sale-items">
                  {salesCart.length === 0 ? (
                    <p className="helper-text">Nenhum item adicionado à venda</p>
                  ) : (
                    salesCart.map(item => (
                      <div className="sale-chip" key={item.id}>
                        <div className="chip-main">
                          <div className="chip-name">{item.name}</div>
                          <div className="chip-meta">{formatCurrency(item.unit_price)} • {item.barcode}</div>
                        </div>
                        <div className="chip-qty">
                          <button className="btn-outline small" onClick={() => decCartQty(item.id)}>-</button>
                          <input type="number" min="1" value={item.quantity} onChange={(e) => updateCartQty(item.id, e.target.value)} />
                          <button className="btn-outline small" onClick={() => incCartQty(item.id)}>+</button>
                        </div>
                        <div className="chip-total">{formatCurrency(item.unit_price * item.quantity)}</div>
                        <button className="btn-outline small remove" onClick={() => removeFromCart(item.id)} title="Remover">
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="sale-summary">
                  {/* Canal de venda removido */}
                  <div className="summary-row"><span>Subtotal</span><strong>{formatCurrency(cartSubtotal)}</strong></div>
                  <div className="form-group">
                    <label>Desconto (R$)</label>
                    <input type="number" min="0" step="0.01" value={saleDiscount} onChange={(e) => setSaleDiscount(e.target.value)} />
                  </div>
                  {discountValue > 0 && (
                    <div className="summary-row discount-row"><span>Desconto</span><strong>-{formatCurrency(discountValue)}</strong></div>
                  )}
                  <div className="summary-row"><span>Total</span><strong>{formatCurrency(cartTotal)}</strong></div>
                  <div className="actions">
                    <button className="btn-success" onClick={handleFinalizeSale} disabled={salesCart.length === 0}>
                      <i className="fas fa-check"></i>
                      Finalizar Venda
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'historico' && (
            <SalesHistory 
              userId={userId}
              showToast={showToast}
              formatCurrency={formatCurrency}
            />
          )}

          {activeTab === 'custos' && (
            <div className="calculator-page">
              <div className="page-header">
                <h2><i className="fas fa-calculator"></i> Cálculo de Custo e Preço de Venda</h2>
                <p className="page-subtitle">Digite o código de barras ou nome do produto, e use o modo simples.</p>
              </div>

              {/* Removido box separado de seleção; busca embutida no card de Entradas abaixo */}
              <div className="calc-grid">
                <div className="calc-card card">
                  <h3>Entradas</h3>
                  <div className="form-group calc-search-group">
                    <label>Buscar produto por código ou nome</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Digite código de barras ou nome"
                      value={calcSearch}
                      onChange={(e)=>{ setCalcSearch(e.target.value); setCalcSuggestOpen(true); }}
                      onFocus={()=> setCalcSuggestOpen(true)}
                      onBlur={()=> setTimeout(()=>setCalcSuggestOpen(false), 150)}
                    />
                    {calcSuggestOpen && calcMatches.length > 0 && (
                      <div className="suggestions-dropdown">
                        {calcMatches.slice(0, 8).map((p) => (
                          <div
                            key={p.id ?? p.barcode}
                            className="suggestion-row"
                            onMouseDown={() => {
                              setCalcProductId(String(p.id ?? p.barcode ?? ''));
                              setCalcSearch(`${p.barcode ? p.barcode + ' — ' : ''}${p.name ?? ''}`);
                              setCalcSuggestOpen(false);
                              const cost = p.cost_price ?? p.last_purchase_value ?? p.sale_price ?? 0;
                              setCostBase(String(cost ?? ''));
                              setSalePriceEdit(String(p.sale_price ?? ''));
                            }}
                          >
                            <div className="sg-name">{p.name || 'Sem nome'}</div>
                            <div className="sg-meta">{p.barcode || ''}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedCalcProduct && (
                    <div className="product-summary">
                      <div className="summary-item"><span>Produto:</span><strong>{selectedCalcProduct.name}</strong></div>
                      {selectedCalcProduct.barcode && (
                        <div className="summary-item"><span>Código:</span><strong>{selectedCalcProduct.barcode}</strong></div>
                      )}
                      <div className="summary-item"><span>Último custo:</span><strong>{formatCurrency(selectedCalcProduct.cost_price ?? selectedCalcProduct.last_purchase_value ?? 0)}</strong></div>
                    </div>
                  )}
                  <div className="form-group"><label>Preço de compra</label><input type="number" step="0.01" className="form-input" value={costBase} onChange={(e)=>setCostBase(e.target.value)} /></div>
                  <div className="form-group"><label>Frete</label><input type="number" step="0.01" className="form-input" value={freight} onChange={(e)=>setFreight(e.target.value)} /></div>
                  <div className="form-group"><label>Embalagem</label><input type="number" step="0.01" className="form-input" value={packaging} onChange={(e)=>setPackaging(e.target.value)} /></div>
                  <div className="form-group"><label>Outros custos</label><input type="number" step="0.01" className="form-input" value={otherCosts} onChange={(e)=>setOtherCosts(e.target.value)} /></div>
                  <div className="form-group"><label>Outros custos (%)</label><input type="number" step="0.01" className="form-input" value={otherCostsPercent} onChange={(e)=>setOtherCostsPercent(e.target.value)} placeholder="Ex.: 5 (para royalty)" /></div>
                  <div className="divider"></div>
                  <h4>Impostos</h4>
                  {calcSimpleMode ? (
                    <div className="form-group"><label>Impostos totais (%)</label><input type="number" step="0.01" className="form-input" value={taxTotal} onChange={(e)=>setTaxTotal(e.target.value)} placeholder="Ex.: 10" /></div>
                  ) : (
                    <div className="tax-grid">
                      <div className="form-group"><label>ICMS (%)</label><input type="number" step="0.01" className="form-input" value={icms} onChange={(e)=>setIcms(e.target.value)} /></div>
                      <div className="form-group"><label>IPI (%)</label><input type="number" step="0.01" className="form-input" value={ipi} onChange={(e)=>setIpi(e.target.value)} /></div>
                      <div className="form-group"><label>PIS (%)</label><input type="number" step="0.01" className="form-input" value={pis} onChange={(e)=>setPis(e.target.value)} /></div>
                      <div className="form-group"><label>COFINS (%)</label><input type="number" step="0.01" className="form-input" value={cofins} onChange={(e)=>setCofins(e.target.value)} /></div>
                      <div className="form-group"><label>ISS (%)</label><input type="number" step="0.01" className="form-input" value={iss} onChange={(e)=>setIss(e.target.value)} /></div>
                    </div>
                  )}
                  <div className="divider"></div>
                  <div className="mode-group">
                    <label className={"mode-label"}>Modo de cálculo</label>
                    <div className="mode-options">
                      <label><input type="radio" name="calcMode" checked={calcMode==='margin'} onChange={()=>setCalcMode('margin')} /> Margem desejada</label>
                      <label><input type="radio" name="calcMode" checked={calcMode==='reverse'} onChange={()=>setCalcMode('reverse')} /> Margem a partir do preço de venda</label>
                    </div>
                  </div>
                  {calcMode === 'margin' && (
                    <div className="form-group"><label>Margem desejada (%)</label><input type="number" step="0.01" className="form-input" value={targetMargin} onChange={(e)=>setTargetMargin(e.target.value)} /></div>
                  )}
                  {calcMode === 'reverse' && (
                    <div className="form-group"><label>Preço de venda</label><input type="number" step="0.01" className="form-input" value={salePriceInput} onChange={(e)=>setSalePriceInput(e.target.value)} /></div>
                  )}
                  <div className="actions">
                    <button className="btn-outline" onClick={()=>{setCostBase('');setFreight('');setPackaging('');setOtherCosts('');setIcms('');setIpi('');setPis('');setCofins('');setIss('');setTargetMargin('');setSalePriceInput('');setTaxTotal('');setCalcProductId('');}}>Limpar</button>
                  </div>
                </div>

                <div className="calc-card card">
                  <h3>Resultados</h3>
                  <div className="summary-row"><span>Custo base</span><strong>{formatCurrency(baseCosts)}</strong></div>
                  <div className="summary-row"><span>Impostos (alíquota total)</span><strong>{(taxRate*100).toFixed(2)}%</strong></div>
                  <div className="summary-row"><span>Custo com impostos</span><strong>{formatCurrency(costWithTaxes)}</strong></div>
                  <div className="divider"></div>
                  <div className="summary-row"><span>Preço de venda calculado</span><strong>{formatCurrency(effectiveSalePrice)}</strong></div>
                  <div className="summary-row"><span>Margem efetiva</span><strong>{isFinite(effectiveMargin) ? `${effectiveMargin.toFixed(2)}%` : '-'}</strong></div>
                  {calcMode === 'margin' && (
                    <div className="helper-text">Preço calculado para atingir a margem desejada.</div>
                  )}
                  {calcMode === 'reverse' && (
                    <div className="helper-text">Margem calculada a partir do preço informado.</div>
                  )}
                  
                  {selectedCalcProduct && costWithTaxes > 0 && effectiveSalePrice > 0 && (
                    <div className="calc-actions">
                      <div className="divider"></div>
                      <button 
                        className="btn-success"
                        onClick={handleApplyCalculatedPrices}
                        title="Aplicar os preços calculados ao produto selecionado"
                      >
                        <i className="fas fa-check"></i>
                        Aplicar ao Produto: {selectedCalcProduct.name}
                      </button>
                      <p className="helper-text">
                        Custo: {formatCurrency(costWithTaxes)} • Venda: {formatCurrency(effectiveSalePrice)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="tips card subtle">
                <h4>Dicas rápidas</h4>
                <ul className="tips-list">
                  <li>Modo simples: informe apenas o total de impostos (%) sem detalhar ICMS/PIS/COFINS/ISS.</li>
                  <li>Digite o nome ou código do produto para preencher automaticamente o preço de compra.</li>
                  <li>Margem desejada: calcula o preço final para atingir a margem informada.</li>
                  <li>Margem a partir do preço: informe um preço de venda e veja a margem efetiva.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'configuracoes' && (
            <div className="configuracoes-page">
              <div className="page-header">
                <h2><i className="fas fa-cog"></i> Configurações do Sistema</h2>
              </div>
              
              <div className="settings-section">
                <div className="settings-card card">
                  <h3><i className="fas fa-user"></i> Perfil do Usuário</h3>
                  <div className="setting-item">
                    <label>Nome de Usuário</label>
                    <input type="text" className="form-input" placeholder="Seu nome" />
                  </div>
                  <div className="setting-item">
                    <label>Email</label>
                    <input type="email" className="form-input" placeholder="seu@email.com" />
                  </div>
                  <button className="btn-primary">
                    <i className="fas fa-save"></i>
                    Salvar Alterações
                  </button>
                </div>

                <div className="settings-card card">
                  <h3><i className="fas fa-store"></i> Configurações da Empresa</h3>
                  <div className="setting-item">
                    <label>Nome da Empresa</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={companySettings.name}
                      onChange={(e) => setCompanySettings({...companySettings, name: e.target.value})}
                      placeholder="Nome da sua empresa" 
                    />
                  </div>
                  <div className="setting-item">
                    <label>Logo da Empresa (URL)</label>
                    <input 
                      type="url" 
                      className="form-input" 
                      value={companySettings.logo}
                      onChange={(e) => setCompanySettings({...companySettings, logo: e.target.value})}
                      placeholder="https://exemplo.com/logo.png" 
                    />
                    <div className="setting-item" style={{ marginTop: '0.5rem' }}>
                      <label>Logo da Empresa (arquivo do computador)</label>
                      <input type="file" accept="image/*" onChange={handleLogoFileChange} />
                    </div>
                    {companySettings.logo && (
                      <div className="logo-preview">
                        <img src={companySettings.logo} alt="Preview do Logo" className="logo-preview-img" />
                      </div>
                    )}
                  </div>
                  <div className="setting-item">
                    <label>Limite de Estoque Baixo</label>
                    <input type="number" className="form-input" placeholder="10" />
                  </div>
                  <button className="btn-primary" onClick={saveCompanySettings}>
                    <i className="fas fa-save"></i>
                    Salvar Configurações
                  </button>
                </div>

                <div className="settings-card card">
                  <h3><i className="fas fa-database"></i> Dados do Sistema</h3>
                  <div className="setting-item">
                    <p>Backup dos dados do sistema</p>
                    <button className="btn-outline">
                      <i className="fas fa-download"></i>
                      Fazer Backup
                    </button>
                  </div>
                  <div className="setting-item">
                    <p>Restaurar dados do backup</p>
                    <button className="btn-outline">
                      <i className="fas fa-upload"></i>
                      Restaurar Backup
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Entrada de Produtos (unificado) */}
      {showEntryModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="entry-modal-title">
          <div className="modal batch-modal">
            <div className="modal-header">
              <h2 id="entry-modal-title">Entrada de Produtos</h2>
              <button 
                className="close-btn" 
                onClick={() => setShowEntryModal(false)}
                aria-label="Fechar modal de entrada de produtos"
              >×</button>
            </div>
            <div className={`modal-body ${simpleMode ? 'simple-mode' : ''}`}>
              {/* Alternador de modo */}
              <div className="mode-switch" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <button
                  className={`btn-tab ${simpleMode ? 'active' : ''}`}
                  onClick={() => setSimpleMode(true)}
                >
                  Modo Simples
                </button>
                <button
                  className={`btn-tab ${!simpleMode ? 'active' : ''}`}
                  onClick={() => setSimpleMode(false)}
                >
                  Modo Avançado
                </button>
              </div>

              {/* Formulário super simples: Código + Nome + Quantidade + Adicionar */}
              <div className="simple-form card simple-only" style={{ marginBottom: '1rem', padding: '1rem' }}>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
                  <div className="form-group barcode-group">
                    <label>Código</label>
                    <input
                      className="big-input"
                      type="text"
                      value={quickEntry.barcode}
                      onChange={(e) => handleQuickEntryChange('barcode', e.target.value)}
                      onFocus={() => setShowSuggestions(suggestions.length > 0)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      placeholder="Digite ou escaneie"
                    />
                    {showSuggestions && suggestions && suggestions.length > 0 && (
                      <div className="suggestions-list">
                        {suggestions.map((p) => (
                          <div
                            key={p.id}
                            className="suggestion-item"
                            onMouseDown={() => {
                              const c = typeof p.cost_price !== 'undefined' ? p.cost_price : p.last_purchase_value;
                              const sale = typeof p.sale_price !== 'undefined' ? p.sale_price : '';
                              setQuickEntry({
                                barcode: String(p.barcode || ''),
                                name: p.name || '',
                                quantity: quickEntry.quantity || '',
                                cost_price: c ? String(Number(c).toFixed(2)) : '',
                                markup: quickEntry.markup || '',
                                sale_price: sale ? String(Number(sale).toFixed(2)) : quickEntry.sale_price || '',
                              });
                              setShowSuggestions(false);
                            }}
                          >
                            <span className="suggest-barcode">{p.barcode}</span>
                            <span className="suggest-name">{p.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Nome do Produto</label>
                    <input 
                      className="big-input" 
                      type="text" 
                      value={quickEntry.name} 
                      onChange={(e) => handleQuickEntryChange('name', e.target.value)} 
                      placeholder="Nome (obrigatório para novos produtos)"
                    />
                  </div>
                  <div className="form-group">
                    <label>Quantidade</label>
                    <input className="big-input" type="number" min="1" value={quickEntry.quantity} onChange={(e) => handleQuickEntryChange('quantity', e.target.value)} />
                  </div>
                  <button
                    className="btn-primary big-primary"
                    onClick={handleSimpleAdd}
                  >
                    <i className="fas fa-check"></i>
                    Adicionar ao estoque
                  </button>
                </div>
                {quickEntry.name && (
                  <p className="helper-text">Produto: {quickEntry.name} • Estoque atual: {products.find(p => String(p.barcode) === String(quickEntry.barcode))?.quantity ?? '-'}
                  </p>
                )}
                <p className="helper-text">Dica: Para produtos existentes, basta código e quantidade. Para novos produtos, informe também o nome.</p>
                {/* Lista do Modo Simples removida; todos os itens aparecem abaixo na lista principal */}
              </div>
              {/* Formulário superior para adicionar item à lista (Modo Avançado) */}
              {!simpleMode && (<>
              <div className="quick-add card advanced-only" style={{ marginBottom: '1rem', padding: '1rem' }}>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 0.8fr 0.8fr 0.6fr 0.9fr auto', gap: '0.75rem', alignItems: 'end' }}>
                  <div className="form-group barcode-group">
                    <label>Código</label>
                    <input
                      type="text"
                      value={quickEntry.barcode}
                      onChange={(e) => handleQuickEntryChange('barcode', e.target.value)}
                      onFocus={() => setShowSuggestions(suggestions.length > 0)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      placeholder="Digite ou escaneie"
                    />
                    {showSuggestions && suggestions && suggestions.length > 0 && (
                      <div className="suggestions-list">
                        {suggestions.map((p) => (
                          <div
                            key={p.id}
                            className="suggestion-item"
                            onMouseDown={() => {
                              const c = typeof p.cost_price !== 'undefined' ? p.cost_price : p.last_purchase_value;
                              const sale = typeof p.sale_price !== 'undefined' ? p.sale_price : '';
                              setQuickEntry({
                                barcode: String(p.barcode || ''),
                                name: p.name || '',
                                quantity: quickEntry.quantity || '',
                                cost_price: c ? String(Number(c).toFixed(2)) : '',
                                markup: quickEntry.markup || '',
                                sale_price: sale ? String(Number(sale).toFixed(2)) : quickEntry.sale_price || '',
                              });
                              setShowSuggestions(false);
                            }}
                          >
                            <span className="suggest-barcode">{p.barcode}</span>
                            <span className="suggest-name">{p.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Nome</label>
                    <input type="text" value={quickEntry.name} onChange={(e) => handleQuickEntryChange('name', e.target.value)} placeholder="Nome do produto" />
                  </div>
                  <div className="form-group">
                    <label>Qtd</label>
                    <input type="number" min="1" value={quickEntry.quantity} onChange={(e) => handleQuickEntryChange('quantity', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Custo (opcional)</label>
                    <input type="number" min="0" step="0.01" value={quickEntry.cost_price} onChange={(e) => handleQuickEntryChange('cost_price', e.target.value)} placeholder="0,01" />
                  </div>
                  <div className="form-group">
                    <label>Percentual acima do custo (%)</label>
                    <input type="number" min="0" step="0.01" value={quickEntry.markup} onChange={(e) => handleQuickEntryChange('markup', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Venda (opcional)</label>
                    <input type="number" min="0.01" step="0.01" value={quickEntry.sale_price} onChange={(e) => handleQuickEntryChange('sale_price', e.target.value)} placeholder="1,00" />
                  </div>
                  <button
                    className="btn-primary"
                    onClick={handleQuickAddToBatch}
                    
                  >
                    <i className="fas fa-plus"></i>
                    Adicionar
                  </button>
                </div>
                <p className="helper-text">Dica: Campos obrigatórios: código, nome e quantidade. Custo e venda são opcionais (padrão: R$ 0,01 e R$ 1,00).</p>
              </div>
              <div className="batch-form advanced-only">
                <div className="batch-tools">
                  <div className="totals-summary">
                    <div className="totals-header">
                      <i className="fas fa-calculator"></i>
                      <span>Resumo da Entrada</span>
                    </div>
                    <div className={`totals-grid four-items`} style={{
                      display: 'flex',
                      flexDirection: 'row',
                      gap: '1rem',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                      alignItems: 'stretch'
                    }}>
                      <div className="total-item" style={{
                        background: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '10px',
                        padding: '1rem',
                        textAlign: 'center',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                        position: 'relative',
                        overflow: 'hidden',
                        flex: '1 1 calc(50% - 0.5rem)',
                        minWidth: '140px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                      }}>
                        <div className="total-label" style={{
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          marginBottom: '0.5rem',
                          fontWeight: '500',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          lineHeight: '1.2'
                        }}>📦 Itens</div>
                        <div className="total-value" style={{
                          fontSize: '1.125rem',
                          fontWeight: '700',
                          color: '#111827',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                          lineHeight: '1.1'
                        }}>{totals.qty}</div>
                      </div>
                      <div className="total-item" style={{
                        background: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '10px',
                        padding: '1rem',
                        textAlign: 'center',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                        position: 'relative',
                        overflow: 'hidden',
                        flex: '1 1 calc(50% - 0.5rem)',
                        minWidth: '140px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                      }}>
                        <div className="total-label" style={{
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          marginBottom: '0.5rem',
                          fontWeight: '500',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          lineHeight: '1.2'
                        }}>💰 Custo Total</div>
                        <div className="total-value cost" style={{
                          fontSize: '1.125rem',
                          fontWeight: '700',
                          color: '#111827',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                          lineHeight: '1.1'
                        }}>{formatCurrency(totals.cost)}</div>
                      </div>
                      <div className="total-item" style={{
                        background: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '10px',
                        padding: '1rem',
                        textAlign: 'center',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                        position: 'relative',
                        overflow: 'hidden',
                        flex: '1 1 calc(50% - 0.5rem)',
                        minWidth: '140px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                      }}>
                        <div className="total-label" style={{
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          marginBottom: '0.5rem',
                          fontWeight: '500',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          lineHeight: '1.2'
                        }}>💵 Venda Total</div>
                        <div className="total-value sale" style={{
                          fontSize: '1.125rem',
                          fontWeight: '700',
                          color: '#111827',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                          lineHeight: '1.1'
                        }}>{formatCurrency(totals.value)}</div>
                      </div>
                      <div className="total-item" style={{
                        background: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '10px',
                        padding: '1rem',
                        textAlign: 'center',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                        position: 'relative',
                        overflow: 'hidden',
                        flex: '1 1 calc(50% - 0.5rem)',
                        minWidth: '140px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                      }}>
                        <div className="total-label" style={{
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          marginBottom: '0.5rem',
                          fontWeight: '500',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          lineHeight: '1.2'
                        }}>📈 Margem</div>
                        <div className="total-value margin" style={{
                          fontSize: '1.125rem',
                          fontWeight: '700',
                          color: '#111827',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                          lineHeight: '1.1'
                        }}>{formatCurrency(totals.margin)}</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Layout de cards para mobile */}
                <div className="batch-products-mobile">
                  {batchProducts.filter(p => p.barcode).map((product, index) => (
                    <div key={index} className="batch-product-card">
                      <div className="product-header">
                        <div className="product-name">{product.name}</div>
                        <button 
                          className="remove-btn"
                          onClick={() => handleRemoveBatchRow(index)}
                        >
                          Remover
                        </button>
                      </div>
                      <div className="product-details">
                        <div className="detail-item">
                          <div className="detail-label">Código</div>
                          <div className="detail-value">{product.barcode}</div>
                        </div>
                        <div className="detail-item">
                          <div className="detail-label">Quantidade</div>
                          <div className="detail-value">{product.quantity}</div>
                        </div>
                        <div className="detail-item">
                          <div className="detail-label">Custo</div>
                          <div className="detail-value">{product.cost_price}</div>
                        </div>
                        <div className="detail-item">
                          <div className="detail-label">Venda</div>
                          <div className="detail-value">{product.sale_price}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {batchProducts.filter(p => p.barcode).length === 0 && (
                    <div className="mobile-empty-message" style={{ 
                      textAlign: 'center', 
                      color: 'var(--text-secondary)', 
                      padding: '2rem',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '2px dashed #d1d5db'
                    }}>
                      Nenhum item adicionado. Use o formulário acima.
                    </div>
                  )}
                </div>
                
                {/* Tabela para desktop */}
                <div className="batch-table-container">
                  <table className="batch-table">
                    <thead>
                      <tr>
                        <th>Código de Barras</th>
                        <th>Nome do Produto</th>
                        <th>Quantidade</th>
                        <th>Preço de Custo</th>
                        <th>Preço de Venda</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchProducts.filter(p => p.barcode).map((product, index) => (
                        <tr key={index}>
                          <td>{product.barcode}</td>
                          <td>{product.name}</td>
                          <td>{product.quantity}</td>
                          <td>{product.cost_price}</td>
                          <td>{product.sale_price}</td>
                          <td className="actions-cell">
                            <button 
                              className="remove-row-btn"
                              onClick={() => handleRemoveBatchRow(index)}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {batchProducts.filter(p => p.barcode).length === 0 && (
                        <tr className="desktop-empty-message">
                          <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                            Nenhum item adicionado. Use o formulário acima.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              </>)}
            </div>
            {!simpleMode && (
              <div className="modal-footer advanced-only">
                <button className="btn-outline" onClick={() => setShowEntryModal(false)}>Cancelar</button>
                <button className="btn-primary" onClick={handleBatchSubmit}>Processar Entrada</button>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Toast */}
      {toast && (
        <div
          className={`toast ${toast.type}`}
          style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: toast.type === 'success' ? '#10b981' : '#ef4444',
            color: '#fff',
            boxShadow: '0 10px 15px rgba(0,0,0,0.1)',
            zIndex: 9999
          }}
        >
          {toast.message}
        </div>
      )}

    {/* Modal de Ajuste de Quantidade */}
    {showQuantityModal && selectedProduct && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="quantity-modal-title">
          <div className="modal">
            <div className="modal-header">
              <h2 id="quantity-modal-title">Ajustar Quantidade</h2>
              <button 
                className="close-btn" 
                onClick={() => setShowQuantityModal(false)}
                aria-label="Fechar modal de ajuste de quantidade"
              >×</button>
            </div>
            <div className="modal-body">
              <p><strong>Produto:</strong> {selectedProduct.name}</p>
              <p><strong>Quantidade Atual:</strong> {selectedProduct.quantity}</p>
              <div className="form-group">
                <label htmlFor="newQuantity">Nova Quantidade:</label>
                <input
                  type="number"
                  id="newQuantity"
                  value={customValue}
                  onChange={handleCustomValueChange}
                  min="0"
                  step="1"
                  className="form-input"
                  placeholder="Ex.: 60"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setShowQuantityModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleUpdateQuantity}>Atualizar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Registro de Venda */}
      {showSaleModal && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Registrar Venda</h2>
              <button className="close-btn" onClick={() => setShowSaleModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>Produto:</strong> {selectedProduct.name}</p>
              <p><strong>Estoque Disponível:</strong> {selectedProduct.quantity}</p>
              {/* Canal de venda removido */}
              <div className="form-group">
                <label htmlFor="unitPrice">Preço unitário:</label>
                <input
                  type="number"
                  id="unitPrice"
                  value={unitPrice === '' ? selectedProduct.sale_price : unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  min="0.01"
                  step="0.01"
                />
                {typeof selectedProduct.cost_price === 'number' && (
                  <p className="helper-text">Custo: {formatCurrency(selectedProduct.cost_price)}</p>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="saleQuantity">Quantidade:</label>
                <input
                  type="number"
                  id="saleQuantity"
                  value={customValue}
                  onChange={handleCustomValueChange}
                  min="1"
                  max={selectedProduct.quantity}
                  step="1"
                />
              </div>
              {customValue && (
                <p><strong>Total da Venda:</strong> {formatCurrency(parseFloat(customValue) * (unitPrice !== '' ? parseFloat(unitPrice) : selectedProduct.sale_price))}</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setShowSaleModal(false)}>Cancelar</button>
              <button className="btn-success" onClick={handleRegisterSale}>Confirmar Venda</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes da Venda */}
      {showSaleDetailsModal && selectedSaleGroup && (
        <div className="modal-overlay">
          <div className="modal sale-details-modal">
            <div className="modal-header">
              <h2>Detalhes da Venda</h2>
              <button className="close-btn" onClick={() => setShowSaleDetailsModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="sale-info">
                <div className="sale-info-row">
                  <span className="label">Data:</span>
                  <span className="value">{new Date(selectedSaleGroup.date).toLocaleString('pt-BR')}</span>
                </div>
                <div className="sale-info-row">
                  <span className="label">Total de Itens:</span>
                  <span className="value">{selectedSaleGroup.items.length}</span>
                </div>
                <div className="sale-info-row total-row">
                  <span className="label">Total da Venda:</span>
                  <span className="value total-value">{formatCurrency(selectedSaleGroup.total)}</span>
                </div>
              </div>
              
              <div className="items-section">
                <h3>Itens da Venda</h3>
                <div className="items-list">
                  {selectedSaleGroup.items.map((item, index) => (
                    <div key={index} className="item-card">
                      <div className="item-header">
                        <span className="item-name">
                          {item.products?.name || item.product_name || 'Produto não encontrado'}
                        </span>
                        <span className="item-total">{formatCurrency(item.total)}</span>
                      </div>
                      <div className="item-details">
                        <span className="item-detail">
                          <strong>Código:</strong> {item.products?.barcode || item.barcode || 'N/A'}
                        </span>
                        <span className="item-detail">
                          <strong>Qtd:</strong> {item.quantity}
                        </span>
                        <span className="item-detail">
                          <strong>Preço Unit.:</strong> {formatCurrency(item.unit_price)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setShowSaleDetailsModal(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Custos e Preços */}
      {showPriceModal && selectedProduct && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="price-modal-title">
          <div className="modal">
            <div className="modal-header">
              <h2 id="price-modal-title">Editar Custos e Preços</h2>
              <button 
                className="close-btn" 
                onClick={() => setShowPriceModal(false)}
                aria-label="Fechar modal de edição de preços"
              >×</button>
            </div>
            <div className="modal-body">
              <p><strong>Produto:</strong> {selectedProduct.name}</p>
              <p><strong>Código:</strong> {selectedProduct.barcode}</p>
              
              <div className="form-group">
                <label htmlFor="editCostPrice">Preço de Custo (R$):</label>
                <input
                  type="number"
                  id="editCostPrice"
                  value={editCostPrice}
                  onChange={(e) => setEditCostPrice(e.target.value)}
                  min="0"
                  step="0.01"
                  className="form-input"
                  placeholder={`Atual: ${formatCurrency(getCost(selectedProduct))}`}
                />
                <p className="helper-text">Deixe vazio para manter o valor atual</p>
              </div>

              <div className="form-group">
                <label htmlFor="editSalePrice">Preço de Venda (R$):</label>
                <input
                  type="number"
                  id="editSalePrice"
                  value={editSalePrice}
                  onChange={(e) => setEditSalePrice(e.target.value)}
                  min="0.01"
                  step="0.01"
                  className="form-input"
                  placeholder={`Atual: ${formatCurrency(selectedProduct.sale_price)}`}
                />
                <p className="helper-text">Deixe vazio para manter o valor atual</p>
              </div>

              {editCostPrice && editSalePrice && (
                <div className="price-summary">
                  <p><strong>Margem de Lucro:</strong> {formatCurrency(parseFloat(editSalePrice) - parseFloat(editCostPrice))}</p>
                  <p><strong>Percentual:</strong> {((parseFloat(editSalePrice) - parseFloat(editCostPrice)) / parseFloat(editCostPrice) * 100).toFixed(2)}%</p>
                </div>
              )}

              <div className="calc-shortcut">
                <p><strong>💡 Dica:</strong> Use a aba "Custos" para cálculos mais detalhados com impostos e margens!</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setShowPriceModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleUpdatePrices}>Atualizar Preços</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação */}
      {showConfirmModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
          <div className="modal confirm-modal">
            <div className="modal-header">
              <h2 id="confirm-modal-title">{confirmTitle}</h2>
            </div>
            <div className="modal-body">
              <div className="confirm-content">
                <div className="confirm-icon">
                  <i className="fas fa-exclamation-triangle"></i>
                </div>
                <p>{confirmMessage}</p>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-outline" 
                onClick={() => setShowConfirmModal(false)}
                disabled={loading.delete}
              >
                Cancelar
              </button>
              <button 
                className="btn-danger" 
                onClick={confirmAction}
                disabled={loading.delete}
              >
                {loading.delete ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Excluindo...
                  </>
                ) : (
                  'Confirmar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      
      {/* Footer com Copyright */}
      <footer className="app-footer">
        <div className="footer-content">
          <p className="copyright">
            © 2025 <strong><a href="https://github.com/https-gustavo" target="_blank" rel="noopener noreferrer">Gustavo Menezes</a></strong> - Projeto Integrador Univesp
          </p>
        </div>
      </footer>
    </>
  );
}
