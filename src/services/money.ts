import Decimal from 'decimal.js';

// Clone isolates accounting precision from any other library's global config.
const Money = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export const MAX_MONEY = 1_000_000_000_000;
type Amount = number | string;

export function roundMoney(value: Amount): number {
  const amount = new Money(value);
  if (!amount.isFinite()) throw new Error('Amount must be finite');
  const rounded = amount.toDecimalPlaces(2);
  if (rounded.abs().gt(MAX_MONEY)) throw new Error('Amount exceeds monetary range (1 trillion)');
  return rounded.isZero() ? 0 : rounded.toNumber();
}
export function sumMoney(values: Amount[]): number {
  return roundMoney(values.reduce((sum, value) => sum.plus(roundMoney(value)), new Money(0)).toString());
}
export function validMoney(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= MAX_MONEY && new Money(value).decimalPlaces() <= 2;
}
