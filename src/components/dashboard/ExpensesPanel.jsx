import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';

function toNum(v) {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isNaN(n) ? 0 : n;
}

export default function ExpensesPanel({ userId, formatCurrency, showToast }) {
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [available, setAvailable] = useState(true);

  const [form, setForm] = useState({ description: '', amount: '', category: 'Geral', date: new Date().toISOString().slice(0, 10), recurring: false });

  const total = useMemo(() => rows.reduce((a, r) => a + Number(r.amount || 0), 0), [rows]);
  const topCategory = useMemo(() => {
    const m = new Map();
    rows.forEach(r => {
      const k = String(r.category || 'Geral');
      m.set(k, (m.get(k) || 0) + Number(r.amount || 0));
    });
    let best = null;
    for (const [k, v] of m.entries()) {
      if (!best || v > best.amount) best = { category: k, amount: v };
    }
    return best;
  }, [rows]);

  const fetchRows = async () => {
    if (!userId) return;
    if (!available) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg = String(e?.message || '');
      const isNotFound = msg.includes('404') || msg.toLowerCase().includes('does not exist') || msg.toLowerCase().includes('not found');
      if (isNotFound) {
        setAvailable(false);
      } else {
        showToast?.(msg || 'Falha ao carregar despesas', 'danger');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRows(); }, [userId, from, to]);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!userId) return;
    if (!available) { showToast?.('Tabela de despesas não configurada no Supabase', 'danger'); return; }
    const description = String(form.description || '').trim();
    const amount = toNum(form.amount);
    const category = String(form.category || 'Geral').trim() || 'Geral';
    const date = String(form.date || '').slice(0, 10);
    if (!description) { showToast?.('Informe a descrição', 'danger'); return; }
    if (!(amount > 0)) { showToast?.('Informe um valor válido', 'danger'); return; }
    setLoading(true);
    try {
      const payload = { user_id: userId, description, amount, category, date, recurring: Boolean(form.recurring) };
      const { error } = await supabase.from('expenses').insert([payload]);
      if (error) throw error;
      setForm({ description: '', amount: '', category, date, recurring: false });
      showToast?.('Despesa cadastrada', 'success');
      fetchRows();
      try { window.dispatchEvent(new Event('dashboard:refresh')); } catch {}
    } catch (e2) {
      showToast?.(e2?.message || 'Falha ao salvar despesa', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    if (!userId || !id) return;
    if (!available) { showToast?.('Tabela de despesas não configurada no Supabase', 'danger'); return; }
    if (!window.confirm('Excluir despesa?')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
      setRows(prev => prev.filter(r => r.id !== id));
      showToast?.('Despesa excluída', 'success');
      try { window.dispatchEvent(new Event('dashboard:refresh')); } catch {}
    } catch (e) {
      showToast?.(e?.message || 'Falha ao excluir despesa', 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="despesas-page">
      <div className="page-header">
        <div>
          <h2>Despesas</h2>
          <p className="page-subtitle">Controle financeiro integrado ao estoque</p>
        </div>
      </div>

      <div className="page-box">
        <div className="stack">
          {!available && (
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Despesas não configuradas</div>
              <div className="helper-text">
                Crie a tabela expenses no Supabase aplicando a migration do projeto:
                supabase/migrations/2026-03-30-finance-expenses-and-profit.sql
              </div>
            </div>
          )}
          <div className="card">
            <div className="section-head">
              <div className="section-title">Período</div>
              <div className="section-meta">{loading ? 'Atualizando...' : `${rows.length} lançamentos`}</div>
            </div>
            <div className="section-body">
              <div className="form-row">
                <div className="form-group">
                  <label>De</label>
                  <input className="form-input" type="date" value={from} onChange={(e)=>setFrom(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Até</label>
                  <input className="form-input" type="date" value={to} onChange={(e)=>setTo(e.target.value)} />
                </div>
              </div>
              <div className="totals-grid" style={{ marginTop: 12 }}>
                <div className="total-card">
                  <div className="total-label">Total</div>
                  <div className="total-value">{formatCurrency(total)}</div>
                </div>
                <div className="total-card">
                  <div className="total-label">Maior categoria</div>
                  <div className="total-value">{topCategory ? `${topCategory.category} (${formatCurrency(topCategory.amount)})` : '—'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="section-head">
              <div className="section-title">Nova despesa</div>
              <div className="section-meta">Preencha e pressione Enter</div>
            </div>
            <form className="section-body" onSubmit={submit}>
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Descrição</label>
                  <input className="form-input" value={form.description} onChange={(e)=>setForm(prev=>({ ...prev, description: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Valor</label>
                  <input className="form-input" type="number" step="0.01" min="0" value={form.amount} onChange={(e)=>setForm(prev=>({ ...prev, amount: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Categoria</label>
                  <input className="form-input" value={form.category} onChange={(e)=>setForm(prev=>({ ...prev, category: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Data</label>
                  <input className="form-input" type="date" value={form.date} onChange={(e)=>setForm(prev=>({ ...prev, date: e.target.value }))} />
                </div>
              </div>
              <label className="checkbox-row" style={{ marginTop: 10 }}>
                <input type="checkbox" checked={form.recurring} onChange={(e)=>setForm(prev=>({ ...prev, recurring: e.target.checked }))} />
                <span>Recorrente</span>
              </label>
              <div className="form-actions">
                <button className="btn-primary" type="submit" disabled={loading || !available}>{loading ? 'Salvando...' : 'Salvar despesa'}</button>
              </div>
            </form>
          </div>

          <div className="card">
            <div className="section-head">
              <div className="section-title">Lançamentos</div>
              <div className="section-meta">Data, descrição, categoria e valor</div>
            </div>
            <div className="section-body">
              {rows.length === 0 ? (
                <div className="helper-text">Nenhuma despesa no período.</div>
              ) : (
                <table className="products-table" role="table" aria-label="Tabela de despesas">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th className="num">Valor</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r=>(
                      <tr key={r.id}>
                        <td className="date">{String(r.date || '').slice(0,10)}</td>
                        <td className="name">{r.description}</td>
                        <td className="category">{r.category || 'Geral'}</td>
                        <td className="num">{formatCurrency(r.amount || 0)}</td>
                        <td className="actions-cell">
                          <button className="btn-action delete" title="Excluir" onClick={()=>remove(r.id)}><i className="fas fa-trash"></i></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
