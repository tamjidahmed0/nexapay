import { IsUUID, IsString, IsPositive, IsNumber, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

const SUPPORTED_CURRENCIES = ['USD', 'BDT', 'EUR', 'GBP', 'SGD'];

export class CreateQuoteDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @IsIn(SUPPORTED_CURRENCIES)
  fromCurrency!: string;

  @IsString()
  @IsIn(SUPPORTED_CURRENCIES)
  toCurrency!: string;

  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  @Type(() => Number)
  fromAmount!: number;
}