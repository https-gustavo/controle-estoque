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

export function allocateProportionalTotals(values, total) {
  const vals = Array.isArray(values) ? values : [];
  const totalCents = Math.max(0, Math.round(Number(total || 0) * 100));
  if (!vals.length) return [];
  const cents = vals.map(v => Math.max(0, Math.round(Number(v || 0) * 100)));
  const sumCents = cents.reduce((a, b) => a + b, 0);
  if (!(sumCents > 0) || !(totalCents > 0)) return cents.map(() => 0);

  const alloc = cents.map(c => Math.floor((c * totalCents) / sumCents));
  let diff = totalCents - alloc.reduce((a, b) => a + b, 0);
  if (!(diff > 0)) return alloc.map(c => c / 100);

  const order = cents
    .map((c, i) => ({ i, r: (c * totalCents) % sumCents }))
    .sort((a, b) => b.r - a.r);

  let k = 0;
  while (diff > 0) {
    alloc[order[k % order.length].i] += 1;
    diff -= 1;
    k += 1;
  }
  return alloc.map(c => c / 100);
}
