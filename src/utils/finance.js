export function computeDiscountRatio(subtotal, total) {
  const s = Number(subtotal || 0);
  const t = Number(total || 0);
  if (!(s > 0)) return 1;
  const r = t / s;
  if (!Number.isFinite(r)) return 1;
  return Math.max(0, Math.min(1, r));
}

export function applyRatio(value, ratio) {
  const v = Number(value || 0);
  const r = Number(ratio || 0);
  const out = v * r;
  if (!Number.isFinite(out)) return 0;
  return Number(out.toFixed(2));
}

