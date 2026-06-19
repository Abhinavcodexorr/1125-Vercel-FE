export const CURRENCY_OPTIONS = [
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'GHS', label: 'Ghana Cedi', symbol: 'GHS' },
] as const;

export type CurrencyCode = (typeof CURRENCY_OPTIONS)[number]['code'];

const LEGACY_CURRENCY_CODES: Record<string, CurrencyCode> = {
  GHC: 'GHS',
};

/** Normalize stored/API currency codes (e.g. legacy GHC → GHS). */
export function normalizeCurrencyCode(code: string | null | undefined): string {
  const upper = (code ?? 'USD').trim().toUpperCase();
  return LEGACY_CURRENCY_CODES[upper] ?? upper;
}

export function currencyDisplaySymbol(code: string | null | undefined): string {
  const normalized = normalizeCurrencyCode(code);
  return CURRENCY_OPTIONS.find((option) => option.code === normalized)?.symbol ?? normalized;
}
