import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';




@Injectable()
export class LedgerService {

    async writeLedgerEntries(prismaTx: any, tx: any) {
        const meta = (tx.metadata as any) ?? {};
        const feeAmount: number = meta.feeAmount ?? 0;
        const feeAccountCode: string =
            meta.feeAccountCode ?? `nexapay:fees:${tx.currency}`;

        const [senderAccount, recipientAccount, feeAccount] = await Promise.all([
            prismaTx.ledgerAccount.upsert({
                where: { code: `user:${tx.senderUserId}:${tx.currency}` },
                create: {
                    code: `user:${tx.senderUserId}:${tx.currency}`,
                    currency: tx.currency,
                    type: 'ASSET',
                },
                update: {},
            }),
            prismaTx.ledgerAccount.upsert({
                where: {
                    code: `user:${tx.recipientUserId}:${tx.toCurrency ?? tx.currency}`,
                },
                create: {
                    code: `user:${tx.recipientUserId}:${tx.toCurrency ?? tx.currency}`,
                    currency: tx.toCurrency ?? tx.currency,
                    type: 'ASSET',
                },
                update: {},
            }),
            prismaTx.ledgerAccount.upsert({
                where: { code: feeAccountCode },
                create: {
                    code: feeAccountCode,
                    currency: tx.currency,
                    type: 'REVENUE',
                },
                update: {},
            }),
        ]);

        const lastEntry = await prismaTx.ledgerEntry.findFirst({
            orderBy: { sequence: 'desc' },
            select: { hash: true },
        });

        const now = new Date();
        const transferAmount = parseFloat(tx.amount.toString());
        const creditCurrency = tx.toCurrency ?? tx.currency;

        // ── Entry 1: DEBIT sender for transfer amount ──────────
        const debitId = randomUUID();
        const debitHash = createHash('sha256')
            .update(
                [
                    lastEntry?.hash ?? '',
                    debitId,
                    tx.id,
                    transferAmount.toString(),
                    'DEBIT',
                    now.toISOString(),
                ].join('|'),
            )
            .digest('hex');

        // ── Entry 2: CREDIT recipient ──────────────────────────
        const creditId = randomUUID();
        const creditAmount = parseFloat(
            (tx.toAmount ?? tx.amount).toString(),
        );
        const creditHash = createHash('sha256')
            .update(
                [
                    debitHash,
                    creditId,
                    tx.id,
                    creditAmount.toString(),
                    'CREDIT',
                    now.toISOString(),
                ].join('|'),
            )
            .digest('hex');

        // ── Entry 3: DEBIT sender for fee ─────────────────────
        const feeDebitId = randomUUID();
        const feeDebitHash = createHash('sha256')
            .update(
                [
                    creditHash,
                    feeDebitId,
                    tx.id,
                    feeAmount.toString(),
                    'DEBIT',
                    now.toISOString(),
                ].join('|'),
            )
            .digest('hex');

        // ── Entry 4: CREDIT nexapay fee account ───────────────
        const feeCreditId = randomUUID();
        const feeCreditHash = createHash('sha256')
            .update(
                [
                    feeDebitHash,
                    feeCreditId,
                    tx.id,
                    feeAmount.toString(),
                    'CREDIT',
                    now.toISOString(),
                ].join('|'),
            )
            .digest('hex');

        /**
         * Double-entry summary:
         */
        await Promise.all([
            prismaTx.ledgerEntry.create({
                data: {
                    id: debitId,
                    transactionId: tx.id,
                    accountId: senderAccount.id,
                    entryType: 'DEBIT',
                    amount: transferAmount,
                    currency: tx.currency,
                    fxRate: tx.fxRate ?? null,
                    description: 'Transfer — sender debit',
                    previousHash: lastEntry?.hash ?? null,
                    hash: debitHash,
                    createdAt: now,
                },
            }),
            prismaTx.ledgerEntry.create({
                data: {
                    id: creditId,
                    transactionId: tx.id,
                    accountId: recipientAccount.id,
                    entryType: 'CREDIT',
                    amount: creditAmount,
                    currency: creditCurrency,
                    fxRate: tx.fxRate ?? null,
                    description: 'Transfer — recipient credit',
                    previousHash: debitHash,
                    hash: creditHash,
                    createdAt: now,
                },
            }),
            prismaTx.ledgerEntry.create({
                data: {
                    id: feeDebitId,
                    transactionId: tx.id,
                    accountId: senderAccount.id,
                    entryType: 'DEBIT',
                    amount: feeAmount,
                    currency: tx.currency,
                    description: 'Fee — sender debit',
                    previousHash: creditHash,
                    hash: feeDebitHash,
                    createdAt: now,
                },
            }),
            prismaTx.ledgerEntry.create({
                data: {
                    id: feeCreditId,
                    transactionId: tx.id,
                    accountId: feeAccount.id,
                    entryType: 'CREDIT',
                    amount: feeAmount,
                    currency: tx.currency,
                    description: 'Fee — Nexapay revenue',
                    previousHash: feeDebitHash,
                    hash: feeCreditHash,
                    createdAt: now,
                },
            }),
        ]);
    }
}
