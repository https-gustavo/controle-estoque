import React, { useEffect, useMemo, useRef, useState } from 'react';

function highlight(text, term) {
  const t = String(term || '').trim();
  const s = String(text || '');
  if (!t) return s;
  const i = s.toLowerCase().indexOf(t.toLowerCase());
  if (i === -1) return s;
  return (
    <>
      {s.slice(0, i)}
      <mark>{s.slice(i, i + t.length)}</mark>
      {s.slice(i + t.length)}
    </>
  );
}

export default function ProductAutocomplete({
  products,
  value,
  onChange,
  onPick,
  placeholder,
  limit = 10
}) {
  const [debounced, setDebounced] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(-1);
  const wrapRef = useRef(null);
  const cacheRef = useRef(new Map());
  const listIdRef = useRef(`product-ac-${Math.random().toString(16).slice(2)}`);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value || ''), 300);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const matches = useMemo(() => {
    const term = String(debounced || '').trim().toLowerCase();
    if (!term) return [];
    const cached = cacheRef.current.get(term);
    if (cached) return cached;
    const arr = (products || []).filter(p =>
      String(p.name || '').toLowerCase().includes(term)
      || String(p.barcode || '').includes(term)
      || String(p.category || '').toLowerCase().includes(term)
    );
    const limited = arr.slice(0, limit);
    cacheRef.current.set(term, limited);
    return limited;
  }, [debounced, products, limit]);

  useEffect(() => {
    const term = String(debounced || '').trim();
    if (!term) { setOpen(false); setIndex(-1); return; }
    setOpen(true);
    setIndex(matches.length ? 0 : -1);
  }, [debounced, matches.length]);

  useEffect(() => {
    const s = String(value || '').trim();
    const isBarcode = s.length >= 8 && /^[0-9]+$/.test(s);
    if (!isBarcode) return;
    const m = (products || []).find(p => String(p.barcode || '') === s);
    if (m) {
      onPick?.(m);
      onChange?.('');
      setOpen(false);
      setIndex(-1);
    }
  }, [value, products, onPick, onChange]);

  const pick = (p) => {
    onPick?.(p);
    onChange?.('');
    setOpen(false);
    setIndex(-1);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setIndex(i => Math.min(matches.length - 1, i + 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex(i => Math.max(0, i - 1));
    }
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'Enter') {
      e.preventDefault();
      if (open && index >= 0 && matches[index]) {
        pick(matches[index]);
        return;
      }
      const raw = String(value || '').trim();
      if (raw) {
        onPick?.(null, raw);
        onChange?.('');
        setOpen(false);
        setIndex(-1);
      }
    }
  };

  return (
    <div ref={wrapRef}>
      <div className="search-with-icon">
        <i className="fas fa-search input-icon" aria-hidden="true"></i>
        <input
          className="form-input"
          value={value}
          onChange={(e)=>onChange?.(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listIdRef.current}
        />
      </div>
      {open && (
        <div id={listIdRef.current} className="suggestions-dropdown" role="listbox" style={{ marginTop: 6, maxHeight: 260, overflowY: 'auto' }}>
          {matches.length === 0 ? (
            <div className="suggestion-item" role="option" aria-selected="false" tabIndex={0} onClick={() => { onPick?.(null, String(value || '').trim()); onChange?.(''); setOpen(false); }}>
              <div style={{ fontWeight: 700 }}>Nenhum produto encontrado</div>
              <div className="helper-text">Enter ou clique para cadastrar como novo</div>
            </div>
          ) : (
            matches.map((p, idx) => (
              <div
                key={p.id}
                className="suggestion-item"
                style={{ background: index === idx ? 'var(--hover-bg)' : undefined }}
                onMouseEnter={() => setIndex(idx)}
                onClick={() => pick(p)}
                role="option"
                id={`${listIdRef.current}-opt-${idx}`}
                aria-selected={index === idx}
                tabIndex={0}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontWeight: 700 }}>{highlight(p.name, debounced)}</div>
                  <span className="badge info">Em estoque</span>
                </div>
                <div className="helper-text">
                  Código: {p.barcode || '—'} | Categoria: {p.category || '—'} | Estoque: {Number(p.quantity || 0)} | {p.sale_price != null ? `R$ ${Number(p.sale_price).toFixed(2)}` : '—'}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
