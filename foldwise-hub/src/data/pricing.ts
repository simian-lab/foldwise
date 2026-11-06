export interface PriceTier {
  minQty: number;
  unitPrice: number; // USD, illustrative
}

export const MAX_QUANTITY = 100000;

/** Normalizes any user input into an integer quantity within [min, MAX_QUANTITY]. */
export function clampQuantity(raw: unknown, min: number): number {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').trim());
  if (Number.isNaN(n) || n === -Infinity) return min;
  if (n === Infinity) return MAX_QUANTITY;
  const whole = Math.floor(n);
  if (whole < min) return min;
  if (whole > MAX_QUANTITY) return MAX_QUANTITY;
  return whole;
}

/** Unit price of the highest tier whose minQty is reached (first tier below its minQty). */
export function unitPrice(tiers: PriceTier[], qty: number): number {
  let price = tiers[0].unitPrice;
  for (const tier of tiers) {
    if (qty >= tier.minQty) price = tier.unitPrice;
  }
  return price;
}

/** Order total rounded to cents. */
export function orderTotal(tiers: PriceTier[], qty: number): number {
  return Math.round(unitPrice(tiers, qty) * qty * 100) / 100;
}
