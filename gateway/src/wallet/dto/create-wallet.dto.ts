import { IsString, IsIn } from 'class-validator';

const SUPPORTED_CURRENCIES = ['USD', 'BDT', 'EUR', 'GBP', 'SGD'] as const;

export class CreateWalletDto {
    @IsString()
    @IsIn(SUPPORTED_CURRENCIES, {
        message: `currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`,
    })
    currency!: string;
}