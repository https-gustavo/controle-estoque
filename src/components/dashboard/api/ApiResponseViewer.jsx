import React, { useMemo } from 'react';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlightJson(text) {
  const safe = escapeHtml(text);
  return safe
    .replace(/(&quot;.*?&quot;)(\s*:)?/g, (m, p1, p2) => `<span class="json-key">${p1}</span>${p2 ? '<span class="json-colon">:</span>' : ''}`)
    .replace(/\b(true|false|null)\b/g, '<span class="json-bool">$1</span>')
    .replace(/\b-?\d+(\.\d+)?\b/g, '<span class="json-num">$&</span>');
}

export default function ApiResponseViewer({ value, statusLabel, statusTone }) {
  const raw = useMemo(() => {
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value ?? null, null, 2); } catch { return String(value ?? ''); }
  }, [value]);
  const html = useMemo(() => highlightJson(raw), [raw]);

  return (
    <div className="api-response">
      <div className="api-response-head">
        <div className="api-response-title">Resposta</div>
        {statusLabel && <span className={`pill ${statusTone || ''}`}>{statusLabel}</span>}
      </div>
      <pre className="code-block" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

