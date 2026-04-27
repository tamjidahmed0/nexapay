import {
  IsUUID,
  IsString,
  IsPositive,
  IsNumber,
  IsOptional,
  IsIn,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

const SUPPORTED_CURRENCIES = ['USD', 'BDT', 'EUR', 'GBP', 'SGD'];

export class CreateInternalTransferDto {
  @IsString()
  @MinLength(1)
  idempotencyKey!: string;

  @IsUUID()
  senderWalletId!: string;

  @IsUUID()
  senderUserId!: string;

  @IsString()
  @MinLength(1)
  recipientIdentifier!: string;

  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  @Type(() => Number)
  amount!: number;

  @IsString()
  @IsIn(SUPPORTED_CURRENCIES)
  currency!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  @Type(() => Number)
  feeAmount?: number;

  @IsOptional()
  @IsString()
  note?: string;
}