export interface CreateInternationalTransfer {
  idempotencyKey: string;

  senderWalletId: string;
  recipientWalletId: string;

  senderUserId: string;
  recipientUserId: string;

  amount: number;

  fromCurrency: 'USD' | 'BDT' | 'EUR' | 'GBP' | 'SGD';
  toCurrency: 'USD' | 'BDT' | 'EUR' | 'GBP' | 'SGD';

  fxQuoteId: string;

  note?: string;
}