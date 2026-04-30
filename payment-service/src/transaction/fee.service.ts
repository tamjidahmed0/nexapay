import { Injectable } from '@nestjs/common';

export interface FeeResult {
    feeAmount: number;
    feeCurrency: string;
    feeAccountCode: string;
}

/**
 * Fee calculation service.
 * Centralized — change fee rules
 */
@Injectable()
export class FeeService {
    // NovaPay fee ledger account — fee credit 
    private readonly FEE_ACCOUNT_CODE = 'nexapay:fees';

    /**
     * Calculate transfer fee.
     *
     * Current rules:
     *   Internal transfer:       1.5% of amount, min 5 BDT, max 500 BDT
     *   International transfer:  2.0% of amount, min 10 BDT, max 1000 BDT
     *   Payroll disbursement:    0.5% of amount, min 2 BDT, max 200 BDT
     */
    calculateFee(
        type: 'INTERNAL' | 'INTERNATIONAL' | 'PAYROLL',
        amount: number,
        currency: string,
    ): FeeResult {
        const feeAccountCode = `${this.FEE_ACCOUNT_CODE}:${currency}`;

        let feePercent: number;
        let minFee: number;
        let maxFee: number;

        switch (type) {
            case 'INTERNAL':
                feePercent = 0.015; // 1.5%
                minFee = 5;
                maxFee = 500;
                break;
            case 'INTERNATIONAL':
                feePercent = 0.02; // 2.0%
                minFee = 10;
                maxFee = 1000;
                break;
            case 'PAYROLL':
                feePercent = 0.005; // 0.5%
                minFee = 2;
                maxFee = 200;
                break;
        }

        const rawFee = amount * feePercent;
        const feeAmount = parseFloat(
            Math.min(maxFee, Math.max(minFee, rawFee)).toFixed(8),
        );

        return { feeAmount, feeCurrency: currency, feeAccountCode };
    }
}