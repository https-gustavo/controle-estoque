import { describe, expect, it } from 'vitest';
import { allocateProportionalTotals, applyRatio, computeDiscountRatio } from './finance';

describe('finance', () => {
  it('computeDiscountRatio returns 1 for invalid subtotal', () => {
    expect(computeDiscountRatio(0, 10)).toBe(1);
    expect(computeDiscountRatio(-1, 10)).toBe(1);
  });

  it('computeDiscountRatio clamps between 0 and 1', () => {
    expect(computeDiscountRatio(100, 80)).toBeCloseTo(0.8, 6);
    expect(computeDiscountRatio(100, 120)).toBe(1);
    expect(computeDiscountRatio(100, -10)).toBe(0);
  });

  it('applyRatio rounds to 2 decimals', () => {
    expect(applyRatio(10, 0.3333)).toBe(3.33);
    expect(applyRatio(10, 0.335)).toBe(3.35);
  });

  it('allocateProportionalTotals splits totals without negative remainder', () => {
    const out = allocateProportionalTotals([10, 10, 10], 29.99);
    const sumCents = out.reduce((a, b) => a + Math.round(Number(b || 0) * 100), 0);
    expect(sumCents).toBe(2999);
    expect(out.every(v => v >= 0)).toBe(true);
  });

  it('allocateProportionalTotals handles edge cases', () => {
    expect(allocateProportionalTotals([], 10)).toEqual([]);
    expect(allocateProportionalTotals([10, 10], 0)).toEqual([0, 0]);
    expect(allocateProportionalTotals([0, 0], 10)).toEqual([0, 0]);
  });
});
