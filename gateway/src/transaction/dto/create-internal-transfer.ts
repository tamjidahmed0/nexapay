import {
  IsString,
  IsPositive,
  IsNumber,
  IsOptional,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';


export class CreateInternalTransferDto {
  @IsString()
  @MinLength(1)
  idempotencyKey!: string;

  @IsString()
  @MinLength(1)
  recipientIdentifier!: string;

  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  @Type(() => Number)
  amount!: number;


  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  @Type(() => Number)
  feeAmount?: number;

  @IsOptional()
  @IsString()
  note?: string;
}