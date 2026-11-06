import { describe, it, expect } from 'vitest';
import { clampQuantity, unitPrice, orderTotal } from '../../src/data/pricing';

const tiers = [
  { minQty: 25, unitPrice: 1.85 },
  { minQty: 100, unitPrice: 1.37 },
  { minQty: 500, unitPrice: 0.98 },
];

describe('clampQuantity', () => {
  it('falls back to min for empty or non-numeric input', () => {
    expect(clampQuantity('', 25)).toBe(25);
    expect(clampQuantity('abc', 25)).toBe(25);
    expect(clampQuantity(undefined, 25)).toBe(25);
  });
  it('raises values below min to min', () => {
    expect(clampQuantity(10, 25)).toBe(25);
  });
  it('caps at 100000', () => {
    expect(clampQuantity(1e9, 25)).toBe(100000);
  });
  it('floors decimals', () => {
    expect(clampQuantity('120.7', 25)).toBe(120);
  });
});

describe('tier pricing', () => {
  it('picks the tier whose minQty is reached', () => {
    expect(unitPrice(tiers, 99)).toBe(1.85);
    expect(unitPrice(tiers, 100)).toBe(1.37);
  });
  it('computes order total rounded to cents', () => {
    expect(orderTotal(tiers, 500)).toBe(490);
    expect(orderTotal(tiers, 33)).toBe(61.05);
  });
});
