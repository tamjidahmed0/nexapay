export const SUPPORTED_CURRENCIES = ['USD', 'BDT', 'EUR', 'GBP', 'SGD'] as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export interface CreateInternalTransferPayload {
  idempotencyKey: string;

  senderWalletId: string;
  recipientWalletId: string;

  senderUserId: string;
  recipientUserId: string;

  amount: number;

  currency: SupportedCurrency;

  feeAmount?: number;

  note?: string;
}