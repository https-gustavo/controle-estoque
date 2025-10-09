import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Dashboard.css';
import { useNavigate } from 'react-router-dom';

export default function Dashboard({ setUser }) {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [stockFilter, setStockFilter] = useState('all'); // all | low | in
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showQuickEntryModal, setShowQuickEntryModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [customValue, setCustomValue] = useState('');
  // Removido canal de venda para simplificar UI
  const [unitPrice, setUnitPrice] = useState('');
  // Novo fluxo de vendas (carrinho rápido)
  const [salesCart, setSalesCart] = useState([]); // {id, barcode, name, unit_price, quantity}
  const [saleDiscount, setSaleDiscount] = useState(''); // valor em moeda
  const [saleSearch, setSaleSearch] = useState('');
  const [saleBarcode, setSaleBarcode] = useState('');
  const [saleSuggestions, setSaleSuggestions] = useState([]);
  const [saleSuggestionIndex, setSaleSuggestionIndex] = useState(-1);
  const [salesHistoryGroups, setSalesHistoryGroups] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [totalSales, setTotalSales] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userId, setUserId] = useState(null);
  
  // Configurações da empresa
  const [companySettings, setCompanySettings] = useState({
    name: 'Estoque Pro',
    logo: ''
  });

  // Calculadora de custos e preço de venda
  const [costBase, setCostBase] = useState('');
  const [freight, setFreight] = useState('');
  const [packaging, setPackaging] = useState('');
  const [otherCosts, setOtherCosts] = useState('');
  const [icms, setIcms] = useState('');
  const [ipi, setIpi] = useState('');
  const [pis, setPis] = useState('');
  const [cofins, setCofins] = useState('');
  const [iss, setIss] = useState('');
  const [calcMode, setCalcMode] = useState('margin'); // 'margin' | 'reverse' (markup removido)
  const [targetMargin, setTargetMargin] = useState(''); // % sobre preço
  const [salePriceInput, setSalePriceInput] = useState(''); // usado no modo reverse
  // Modo simples e seleção de produto para facilitar o uso
  const [calcSimpleMode, setCalcSimpleMode] = useState(true); // quando true, usa impostos totais e esconde detalhes
  const [taxTotal, setTaxTotal] = useState(''); // impostos totais (%) no modo simples
  const [calcProductId, setCalcProductId] = useState(''); // produto selecionado para preencher custo
  const [calcSearch, setCalcSearch] = useState(''); // texto digitado (código ou nome)
  const [calcSuggestOpen, setCalcSuggestOpen] = useState(false);
  const [salePriceEdit, setSalePriceEdit] = useState(''); // preço de venda editável do produto selecionado
  const [savingPrice, setSavingPrice] = useState(false); // estado de salvamento

  const toNum = (v) => {
    const n = parseFloat(String(v ?? '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  };

  const baseCosts = toNum(costBase) + toNum(freight) + toNum(packaging) + toNum(otherCosts);
  const taxRate = calcSimpleMode
    ? (toNum(taxTotal) / 100)
    : (toNum(icms) + toNum(ipi) + toNum(pis) + toNum(cofins) + toNum(iss)) / 100;
  const costWithTaxes = baseCosts * (1 + taxRate);
  const computedByMargin = targetMargin ? (costWithTaxes / (1 - toNum(targetMargin) / 100)) : costWithTaxes;
  const effectiveSalePrice = calcMode === 'margin' ? computedByMargin
                           : toNum(salePriceInput);
  const effectiveMargin = effectiveSalePrice > 0
    ? ((effectiveSalePrice - costWithTaxes) / effectiveSalePrice) * 100
    : 0;

  // Seleção de produto para preencher custo base automaticamente
  const selectedCalcProduct = products.find(p => String(p.id) === String(calcProductId));
  const useSelectedProductCost = () => {
    if (!selectedCalcProduct) return;
    // tenta usar cost_price; se ausente, usa last_purchase_value; senão, sale_price como fallback (menos ideal)
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

  // Sugestões para busca por código ou nome
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
    if (userId) {
      (async () => {
        try {
          const { data, error } = await supabase
            .from('store_settings')
            .select('name, logo')
            .eq('user_id', userId)
            .single();
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
  const handleLogoFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    // Tenta enviar para Supabase Storage (bucket: 'logos'). Se falhar, usa base64 local.
    const ext = file.name.split('.').pop();
    const fileName = `logo_${Date.now()}.${ext || 'png'}`;
    try {
      const { data, error } = await supabase.storage.from('logos').upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = await supabase.storage.from('logos').getPublicUrl(data.path);
      const publicUrl = pub?.publicUrl || '';
      if (publicUrl) {
        setCompanySettings(prev => ({ ...prev, logo: publicUrl }));
        // Persistir logo por usuário
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
      // Fallback: ler como DataURL e armazenar localmente
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        setCompanySettings(prev => ({ ...prev, logo: dataUrl }));
        // Persistir logo base64 por usuário
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

  // Mantém userId sincronizado com a sessão do Supabase
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled) setUserId(session?.user?.id ?? null);
    };
    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
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
        return matchesQuery && matchesStock && matchesCategory;
      });
      setFilteredProducts(filtered);
      
      // Atualizar estatísticas
      setTotalProducts(products.length);
      setLowStockCount(products.filter(p => p.quantity < 10).length);
    }
  }, [products, searchTerm]);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .order('name');
    
    if (error) {
      console.error('Erro ao buscar produtos:', error);
      // Se ordenar por "name" falhar, busca sem ordenação
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
      setProducts(data || []);
    }
    
    // Buscar total de vendas
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('total')
      .eq('user_id', userId);
      
    if (!salesError && salesData) {
      const total = salesData.reduce((sum, sale) => sum + sale.total, 0);
      setTotalSales(total);
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

  const handleDeleteProduct = async (productId) => {
    if (!productId || !userId) return;
    const confirmed = window.confirm('Excluir este produto? Esta ação não pode ser desfeita.');
    if (!confirmed) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('user_id', userId);

    if (error) {
      console.error('Erro ao excluir produto:', error);
      alert('Erro ao excluir produto.');
    } else {
      fetchProducts();
      showToast('success', 'Produto excluído.');
    }
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
      return [...prev, {
        id: product.id,
        barcode: product.barcode,
        name: product.name || product.product_name || String(product.barcode) || 'Produto',
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

  const handleAddByBarcode = () => {
    const v = saleBarcode.trim();
    if (!v) return;
    const match = products.find(p => String(p.barcode) === v);
    if (!match) { showToast('error', 'Código não encontrado'); return; }
    addProductToCart(match, 1);
    setSaleBarcode('');
  };

  const handleBarcodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddByBarcode();
    }
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
    for (const item of salesCart) {
      const total = item.unit_price * item.quantity;
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
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(100);
    if (error) {
      console.error('Erro ao carregar histórico de vendas:', error);
      return;
    }
    const map = new Map();
    for (const row of data) {
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

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Erro ao fazer logout:', error);
    } else {
      setUser(null);
      navigate('/');
    }
  };

  // Paginação do histórico
  const historyTotalPages = Math.max(1, Math.ceil((salesHistoryGroups?.length || 0) / historyPageSize));
  const clampedPage = Math.min(historyPage, historyTotalPages);
  const startIdx = (clampedPage - 1) * historyPageSize;
  const pagedSalesHistoryGroups = salesHistoryGroups.slice(startIdx, startIdx + historyPageSize);
  const goPrevHistoryPage = () => setHistoryPage((p) => Math.max(1, p - 1));
  const goNextHistoryPage = () => setHistoryPage((p) => Math.min(historyTotalPages, p + 1));
  const handlePageSizeChange = (val) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0) { setHistoryPageSize(n); setHistoryPage(1); }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
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
    // Regras de cálculo simplificadas: venda sempre calculada a partir do custo + percentual
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
    const c = parseFloat(String(quickEntry.cost_price).replace(',', '.'));
    const s = parseFloat(String(quickEntry.sale_price).replace(',', '.'));
    if (!quickEntry.barcode || !quickEntry.name || isNaN(q) || q <= 0 || isNaN(c) || c < 0 || isNaN(s) || s <= 0 || s < c) {
      showToast('error', 'Preencha código, nome, quantidade, custo e venda (≥ custo).');
      return;
    }
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

  // Entrada simplificada: acumula linhas para processar depois
  const handleSimpleAdd = async () => {
    const q = parseFloat(quickEntry.quantity);
    if (!quickEntry.barcode || isNaN(q) || q <= 0) {
      showToast('error', 'Informe código e quantidade.');
      return;
    }

    // Busca produto existente e atualiza estoque imediatamente
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

    if (!existing || existing.length === 0) {
      showToast('error', 'Produto não cadastrado. Use Modo Avançado ou cadastre em Produtos.');
      return;
    }

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
    const c = parseFloat(String(quickEntry.cost_price).replace(',', '.'));
    const s = parseFloat(String(quickEntry.sale_price).replace(',', '.'));
    if (!quickEntry.barcode || !quickEntry.name || isNaN(q) || q <= 0 || isNaN(c) || c < 0 || isNaN(s) || s <= 0 || s < c) {
      showToast('error', 'Preencha código, nome, quantidade, custo e venda (≥ custo).');
      return;
    }

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
    <div className="dashboard-container">
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
              <a href="#" className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                <span className="nav-icon"><i className="fas fa-chart-bar"></i></span>
                <span>Dashboard</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" className={`nav-link ${activeTab === 'produtos' ? 'active' : ''}`} onClick={() => setActiveTab('produtos')}>
                <span className="nav-icon"><i className="fas fa-boxes"></i></span>
                <span>Produtos</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" className={`nav-link ${activeTab === 'vendas' ? 'active' : ''}`} onClick={() => setActiveTab('vendas')}>
                <span className="nav-icon"><i className="fas fa-cash-register"></i></span>
                <span>Vendas</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" className={`nav-link ${activeTab === 'custos' ? 'active' : ''}`} onClick={() => setActiveTab('custos')}>
                <span className="nav-icon"><i className="fas fa-calculator"></i></span>
                <span>Cálculo de Custos</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" className={`nav-link ${activeTab === 'configuracoes' ? 'active' : ''}`} onClick={() => setActiveTab('configuracoes')}>
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

  <div className="main-content">
      <div className="dashboard-header">
        <div className="header-content">
          <button className="menu-toggle" onClick={toggleSidebar}>
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
                  <div className="stat-card">
                    <div className="stat-icon">
                      <i className="fas fa-money-bill-wave"></i>
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Total de Vendas</div>
                      <div className="stat-value">{formatCurrency(totalSales)}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">
                      <i className="fas fa-boxes"></i>
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Total de Produtos</div>
                      <div className="stat-value">{totalProducts}</div>
                    </div>
                  </div>
                  <div className="stat-card">
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
                <button className="btn-primary" onClick={() => setShowEntryModal(true)}>
                  <i className="fas fa-plus"></i>
                  Adicionar Produto
                </button>
              </div>
              
              <div className="products-section card">
                <div className="products-filters" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="productCodeSearch">Código de Barras</label>
                    <input
                      id="productCodeSearch"
                      type="text"
                      className="form-input"
                      placeholder="Pesquisar por código de barras"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="productNameSearch">Busca por Nome/Código</label>
                    <input
                      id="productNameSearch"
                      type="text"
                      className="form-input"
                      placeholder="Pesquisar por nome ou código"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="products-table-container">
                  <table className="products-table">
                    <thead>
                      <tr>
                        <th>Código de Barras</th>
                        <th>Nome do Produto</th>
                        <th>Quantidade em Estoque</th>
                        <th>Preço de Custo</th>
                        <th>Preço de Venda</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((product) => (
                          <tr key={product.id}>
                            <td>{product.barcode}</td>
                            <td>{product.name}</td>
                            <td>
                              <span className={`quantity-badge ${product.quantity < 10 ? 'low-stock' : ''}`}>
                                {product.quantity}
                              </span>
                            </td>
                            <td>{formatCurrency(getCost(product))}</td>
                            <td>{formatCurrency(product.sale_price)}</td>
                            <td>
                              <span className={`status-badge ${product.quantity < 10 ? 'warning' : 'success'}`}>
                                {product.quantity < 10 ? 'Estoque Baixo' : 'Em Estoque'}
                              </span>
                            </td>
                            <td className="actions-cell">
                              <button
                                className="btn-outline btn-action"
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setShowQuantityModal(true);
                                }}
                                title="Ajustar Quantidade"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                className="btn-outline btn-action"
                                onClick={() => handleDeleteProduct(product.id)}
                                title="Excluir Produto"
                                style={{ color: '#ef4444', borderColor: '#ef4444' }}
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="no-products">
                            Nenhum produto cadastrado
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
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
                  <div className="quick-block card subtle">
                    <div className="form-group">
                      <label htmlFor="barcodeInput">Código de Barras</label>
                      <input
                        id="barcodeInput"
                        type="text"
                        value={saleBarcode}
                        onChange={(e) => setSaleBarcode(e.target.value)}
                        onKeyDown={handleBarcodeKeyDown}
                        placeholder="Digite ou escaneie e pressione Enter"
                        className="form-input"
                      />
                    </div>
                    <button className="btn-primary" onClick={handleAddByBarcode} style={{ alignSelf: 'end' }}>
                      <i className="fas fa-barcode"></i>
                      Adicionar por código
                    </button>
                  </div>
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
                            <div className="sg-name">{renderHighlighted(String(s.name || s.product_name || s.barcode || 'Produto'), saleSearch)}</div>
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
                  <div className="summary-row"><span>Total</span><strong>{formatCurrency(cartTotal)}</strong></div>
                  <div className="actions">
                    <button className="btn-success" onClick={handleFinalizeSale} disabled={salesCart.length === 0}>
                      <i className="fas fa-check"></i>
                      Finalizar Venda
                    </button>
                  </div>
                </div>
              </div>

              <div className="sales-history card">
                <div className="history-header">
                  <h3>Histórico de Vendas (recentes)</h3>
                  <div className="history-controls">
                    <label className="page-label">Itens por página</label>
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
                {salesHistoryGroups && salesHistoryGroups.length > 0 ? (
                  <div className="history-list">
                    {pagedSalesHistoryGroups.map(group => (
                      <div className="history-item" key={group.date}>
                        <div className="history-main">
                          <div className="history-date">{new Date(group.date).toLocaleString()}</div>
                          <div className="history-total">{formatCurrency(group.total)}</div>
                          <div className="history-count">{group.items.length} itens</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="helper-text">Nenhuma venda registrada recentemente</p>
                )}
              </div>
            </div>
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
        <div className="modal-overlay">
          <div className="modal batch-modal">
            <div className="modal-header">
              <h2>Entrada de Produtos</h2>
              <button className="close-btn" onClick={() => setShowEntryModal(false)}>×</button>
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

              {/* Formulário super simples: Código + Quantidade + Adicionar */}
              <div className="simple-form card simple-only" style={{ marginBottom: '1rem', padding: '1rem' }}>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
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
                <p className="helper-text">Dica: escaneie o código e informe a quantidade. Para cadastrar novos produtos, use Modo Avançado.</p>
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
                    <label>Custo</label>
                    <input type="number" min="0" step="0.01" value={quickEntry.cost_price} onChange={(e) => handleQuickEntryChange('cost_price', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Percentual acima do custo (%)</label>
                    <input type="number" min="0" step="0.01" value={quickEntry.markup} onChange={(e) => handleQuickEntryChange('markup', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Venda</label>
                    <input type="number" min="0.01" step="0.01" value={quickEntry.sale_price} onChange={(e) => handleQuickEntryChange('sale_price', e.target.value)} />
                  </div>
                  <button
                    className="btn-primary"
                    onClick={handleQuickAddToBatch}
                    
                  >
                    <i className="fas fa-plus"></i>
                    Adicionar
                  </button>
                </div>
              </div>
              <div className="batch-form advanced-only">
                <div className="batch-tools" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div className="totals" style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span>Itens: {totals.qty}</span>
                    <span>Custo: {formatCurrency(totals.cost)}</span>
                    <span>Venda: {formatCurrency(totals.value)}</span>
                    <span>Margem: {formatCurrency(totals.margin)}</span>
                  </div>
                </div>
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
                        <tr>
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
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Ajustar Quantidade</h2>
              <button className="close-btn" onClick={() => setShowQuantityModal(false)}>×</button>
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
    </div>
  );
}
