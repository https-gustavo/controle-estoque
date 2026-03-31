export const demoSeed = {
  products: [
    { id: 'p1', name: 'Café Premium 500g', barcode: '789100000001', category: 'Mercearia', quantity: 24, cost_price: 12.5, sale_price: 19.9, created_at: new Date().toISOString() },
    { id: 'p2', name: 'Arroz Tipo 1 5kg', barcode: '789100000002', category: 'Mercearia', quantity: 8, cost_price: 18.0, sale_price: 26.9, created_at: new Date().toISOString() },
    { id: 'p3', name: 'Detergente Neutro 500ml', barcode: '789100000003', category: 'Limpeza', quantity: 3, cost_price: 2.3, sale_price: 4.9, created_at: new Date().toISOString() },
    { id: 'p4', name: 'Chocolate 90g', barcode: '789100000004', category: 'Doces', quantity: 42, cost_price: 3.1, sale_price: 6.5, created_at: new Date().toISOString() }
  ],
  sales: [],
  expenses: [
    { id: 'e1', description: 'Frete de reposição', amount: 58.9, category: 'Logística', date: new Date().toISOString().slice(0, 10), recurring: false, created_at: new Date().toISOString() },
    { id: 'e2', description: 'Embalagens', amount: 24.5, category: 'Operação', date: new Date().toISOString().slice(0, 10), recurring: false, created_at: new Date().toISOString() }
  ]
};

