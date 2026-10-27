import { CurrencyInfo, SUPPORTED_CURRENCIES } from '../types';

export function getCurrencyInfo(code: string | undefined): CurrencyInfo {
  if (!code) return SUPPORTED_CURRENCIES[0]; // GBP
  const upper = code.trim().toUpperCase();
  const hit = SUPPORTED_CURRENCIES.find(c => c.code === upper);
  if (hit) return hit;
  return {
    code: upper,
    symbol: upper,
    name: upper,
    flag: '🌐',
    rateToGbp: 1.0
  };
}

export function formatCurrencyAmount(
  amount: number | null | undefined,
  currencyCode?: string
): string {
  if (amount == null || !Number.isFinite(amount)) return '—';
  const info = getCurrencyInfo(currencyCode);
  const formatted = amount.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${info.symbol}${formatted}`;
}

/**
 * Calculates exchange rate between two currencies.
 * Rate represents: 1 unit of `fromCode` = X units of `toCode`.
 */
export function getDefaultExchangeRate(fromCode: string, toCode: string): number {
  if (fromCode.toUpperCase() === toCode.toUpperCase()) return 1.0;
  const fromInfo = getCurrencyInfo(fromCode);
  const toInfo = getCurrencyInfo(toCode);
  if (toInfo.rateToGbp === 0) return 1.0;

  // fromCurrency -> GBP -> toCurrency
  // 1 from = fromInfo.rateToGbp in GBP
  // 1 to = toInfo.rateToGbp in GBP
  // => 1 from = (fromInfo.rateToGbp / toInfo.rateToGbp) to
  const rawRate = fromInfo.rateToGbp / toInfo.rateToGbp;
  // Round rate intelligently: if rate < 0.01 keep 6 decimals, else 4 decimals
  if (rawRate < 0.01) {
    return Math.round(rawRate * 1000000) / 1000000;
  }
  return Math.round(rawRate * 10000) / 10000;
}

/**
 * Converts an amount from one currency to another using the specified or default exchange rate.
 * @param amount Amount in `fromCode` currency
 * @param fromCode Expense / source currency
 * @param toCode Home / target currency
 * @param customRate Custom rate (where 1 `fromCode` = customRate `toCode`)
 */
export function convertCurrency(
  amount: number,
  fromCode: string,
  toCode: string,
  customRate?: number | null
): { converted: number; rate: number } {
  const rate = customRate && customRate > 0 ? customRate : getDefaultExchangeRate(fromCode, toCode);
  const converted = Math.round((amount * rate + Number.EPSILON) * 100) / 100;
  return { converted, rate };
}

/**
 * Attempt to fetch live exchange rates with a safe fallback to static rates.
 */
export async function fetchLiveRates(baseCurrency: string = 'GBP'): Promise<Record<string, number> | null> {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency.toUpperCase()}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.rates) {
      return data.rates as Record<string, number>;
    }
  } catch (err) {
    console.debug('Live currency fetch skipped or offline, using built-in rates.');
  }
  return null;
}
