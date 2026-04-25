export const CURRENCY_META = {
  USD: { symbol: '$', name: 'US Dollar' },
  BDT: { symbol: '৳', name: 'Bangladeshi Taka' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
  SGD: { symbol: 'S$', name: 'Singapore Dollar' },
} as const;

export type SupportedCurrency = keyof typeof CURRENCY_META;

export function getCurrencySymbol(currency: SupportedCurrency): string {
  return CURRENCY_META[currency]?.symbol ?? '';
}