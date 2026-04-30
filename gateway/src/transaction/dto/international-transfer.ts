import {
    IsUUID,
    IsString,
    IsPositive,
    IsNumber,
    IsIn,
    IsOptional,
    MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

const SUPPORTED_CURRENCIES = ['USD', 'BDT', 'EUR', 'GBP', 'SGD'];

export class CreateInternationalTransferDto {
    @IsString()
    @MinLength(1)
    idempotencyKey!: string;

    @IsUUID()
    senderWalletId!: string;

    @IsUUID()
    recipientWalletId!: string;

    @IsUUID()
    senderUserId!: string;

    @IsUUID()
    recipientUserId!: string;

    @IsNumber({ maxDecimalPlaces: 8 })
    @IsPositive()
    @Type(() => Number)
    amount!: number;

    @IsString()
    @IsIn(SUPPORTED_CURRENCIES)
    fromCurrency!: string;

    @IsString()
    @IsIn(SUPPORTED_CURRENCIES)
    toCurrency!: string;

    /**
     * Must be a valid, unexpired, unused FXQuote ID.
     * Obtained from POST /fx/quote before calling this endpoint.
     * Quote expires in 60s — if expired, re-initiate with a fresh quote.
     */
    @IsUUID()
    fxQuoteId!: string;

    @IsOptional()
    @IsString()
    note?: string;
}