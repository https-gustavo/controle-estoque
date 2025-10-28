import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './SalesHistory.css';

/**
 * Componente para visualizar e gerenciar o histórico de vendas
 * Inclui filtros por produto, data e paginação
 */
const SalesHistory = ({ userId, showToast, formatCurrency }) => {
  // Estados para controle do histórico
  const [salesHistoryGroups, setSalesHistoryGroups] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState('all');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  
  // Modal de detalhes da venda
  const [showSaleDetailsModal, setShowSaleDetailsModal] = useState(false);
  const [selectedSaleGroup, setSelectedSaleGroup] = useState(null);

  /**
   * Busca e organiza o histórico de vendas do usuário
   * Combina dados de vendas com informações dos produtos
   */
  const fetchSalesHistory = async () => {
    if (!userId) return;

    try {
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (salesError) {
        console.error('Erro ao carregar histórico de vendas:', salesError);
        showToast('error', 'Erro ao carregar histórico de vendas');
        return;
      }

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId);

      if (productsError) {
        console.error('Erro ao carregar produtos:', productsError);
        showToast('error', 'Erro ao carregar produtos');
        return;
      }

      // Combina dados de vendas com informações dos produtos
      const salesWithProducts = salesData.map(sale => ({
        ...sale,
        products: productsData.find(p => p.id === sale.product_id)
      }));

      // Agrupa vendas por data para melhor organização
      const grouped = salesWithProducts.reduce((acc, sale) => {
        const saleDate = new Date(sale.date);
        if (isNaN(saleDate.getTime())) {
          console.warn('Data inválida encontrada:', sale.date);
          return acc;
        }
        
        const dateKey = saleDate.toISOString();
        
        if (!acc[dateKey]) {
          acc[dateKey] = {
            date: dateKey,
            items: [],
            total: 0
          };
        }
        
        const saleTotal = sale.total || 0;
        acc[dateKey].items.push({
          ...sale,
          total: saleTotal
        });
        acc[dateKey].total += saleTotal;
        
        return acc;
      }, {});

      // Ordena grupos por data (mais recente primeiro)
      const groupedArray = Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date));
      setSalesHistoryGroups(groupedArray);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      showToast('error', 'Erro ao carregar histórico de vendas');
    }
  };

  useEffect(() => {
    fetchSalesHistory();
  }, [userId]);

  const filteredSalesHistoryGroups = salesHistoryGroups.filter(group => {
    // Primeiro verifica se há filtro de texto (produto ou código)
    if (historyFilter) {
      const hasMatchingProduct = group.items.some(item => {
        const productName = item.products?.name || '';
        const productBarcode = item.products?.barcode || '';
        return productName.toLowerCase().includes(historyFilter.toLowerCase()) ||
               productBarcode.toLowerCase().includes(historyFilter.toLowerCase());
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
  };

  return (
    <div className="sales-history-page">
      <div className="page-header">
        <h2><i className="fas fa-chart-line"></i> Histórico de Vendas</h2>
        <p className="page-subtitle">Visualize e gerencie todo o histórico de vendas da sua loja.</p>
      </div>

      <div className="sales-history card">
        <div className="history-header">
          <div className="history-controls">
            <div className="history-filters">
              <input 
                type="text" 
                placeholder="Buscar por produto..." 
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
                <div className="history-item-card" key={group.date}>
                  <div className="history-card-header">
                    <div className="history-date">
                      <i className="fas fa-calendar-alt"></i>
                      <span>{(() => {
                        const date = new Date(group.date);
                        return isNaN(date.getTime()) ? 'Data inválida' : date.toLocaleDateString('pt-BR', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                      })()}</span>
                    </div>
                    <div className="history-total">
                      <span className="total-label">Total:</span>
                      <span className="total-value">{formatCurrency(group.total)}</span>
                    </div>
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
                            <span className="product-unit-price">Unit: {formatCurrency(item.unit_price || 0)}</span>
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
                  <span className="label">Total de Itens:</span>
                  <span className="value">{selectedSaleGroup.items.length}</span>
                </div>
                <div className="sale-info-row total-row">
                  <span className="label">Valor Total:</span>
                  <span className="total-value">{formatCurrency(selectedSaleGroup.total)}</span>
                </div>
              </div>
              
              <div className="items-section">
                <h3>Produtos Vendidos</h3>
                <div className="items-list">
                  {selectedSaleGroup.items.map((item, idx) => (
                    <div className="item-card" key={idx}>
                      <div className="item-header">
                        <span className="item-name">
                          {(item.products?.name && item.products.name.trim()) || 
                           (item.products?.barcode ? `Produto ${item.products.barcode}` : 'Produto sem nome')}
                        </span>
                        <span className="item-total">{formatCurrency(item.total || 0)}</span>
                      </div>
                      <div className="item-details">
                        {item.products?.barcode && (
                          <div className="item-detail">
                            <strong>Código:</strong> {item.products.barcode}
                          </div>
                        )}
                        <div className="item-detail">
                          <strong>Quantidade:</strong> {item.quantity}
                        </div>
                        <div className="item-detail">
                          <strong>Preço Unit.:</strong> {formatCurrency(item.unit_price || 0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;