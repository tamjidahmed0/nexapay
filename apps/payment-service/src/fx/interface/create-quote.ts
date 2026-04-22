const SUPPORTED_CURRENCIES = ['USD', 'BDT', 'EUR', 'GBP', 'SGD'] as const;

export type Currency = typeof SUPPORTED_CURRENCIES[number];

export interface CreateQuoteDto {
  userId: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  fromAmount: number;
}