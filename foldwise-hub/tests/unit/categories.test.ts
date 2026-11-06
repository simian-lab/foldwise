import { describe, it, expect } from 'vitest';
import { categories, getCategory, minOrderUnits } from '../../src/data/categories';
import { palette, taglines, voice } from '../../src/data/brand';

const order = [
  'cajas-de-envio', 'cajas-reforzadas', 'cajas-mailer', 'mailers-faciles',
  'cajas-livianas', 'cajas-multi-altura', 'cajas-de-archivo', 'cajas-de-mudanza',
  'cajas-carga-lateral', 'cajas-vino-botellas', 'cajas-regalo-retail', 'cajas-ropa',
];

describe('categories', () => {
  it('has 12 unique slugs in spec order', () => {
    expect(categories.map((c) => c.slug)).toEqual(order);
    expect(new Set(categories.map((c) => c.slug)).size).toBe(12);
  });
  it('heavy duty uses ect 44 and flute BC', () => {
    const c = getCategory('cajas-reforzadas')!;
    expect(c.ect).toBe(44);
    expect(c.flute).toBe('BC');
  });
  it('every category has >=3 sizes, ascending tiers and valid minUnits', () => {
    for (const c of categories) {
      expect(c.sizes.length).toBeGreaterThanOrEqual(3);
      expect(c.minUnits).toBeGreaterThanOrEqual(1);
      expect(c.tiers[0].minQty).toBeLessThanOrEqual(c.minUnits);
      for (let i = 1; i < c.tiers.length; i++) {
        expect(c.tiers[i].minQty).toBeGreaterThan(c.tiers[i - 1].minQty);
        expect(c.tiers[i].unitPrice).toBeLessThan(c.tiers[i - 1].unitPrice);
      }
    }
  });
  it('every category starts at the same 25-box minimum', () => {
    for (const c of categories) {
      expect(c.minUnits, c.slug).toBe(25);
      expect(c.tiers[0].minQty, c.slug).toBe(25);
    }
    expect(minOrderUnits).toBe(25);
    expect(voice.ejemplos[0].despues).toContain('25 cajas');
  });
  it('only mailer and shipping are featured', () => {
    expect(categories.filter((c) => c.featured).map((c) => c.slug).sort()).toEqual(['cajas-de-envio', 'cajas-mailer']);
  });
  it('getCategory returns undefined for unknown slug', () => {
    expect(getCategory('nope')).toBeUndefined();
  });
  it('no field contains "ebiopacking"', () => {
    const all = JSON.stringify({ categories, palette, taglines, voice }).toLowerCase();
    expect(all).not.toContain('ebiopacking');
  });
  it('voice has 5 si, 5 no and 3 examples', () => {
    expect(voice.si).toHaveLength(5);
    expect(voice.no).toHaveLength(5);
    expect(voice.ejemplos).toHaveLength(3);
  });
});
