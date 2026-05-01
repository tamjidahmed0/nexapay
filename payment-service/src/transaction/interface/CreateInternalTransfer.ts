export const SUPPORTED_CURRENCIES = ['USD', 'BDT', 'EUR', 'GBP', 'SGD'] as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export interface CreateInternalTransferPayload {
  
  idempotencyKey: string;

  amount: number;

  // currency: SupportedCurrency;

  feeAmount?: number;

  recipientIdentifier: string; // email or uid

  note?: string;
}