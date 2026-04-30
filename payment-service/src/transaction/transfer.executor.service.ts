import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { Prisma, Transaction } from "../../generated/prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { FeeService } from "./fee.service";
import { LedgerService } from "./ledger.service";

@Injectable()
export class TransferExecutor {

    constructor(
        private readonly prisma: PrismaService,
        private readonly feeService: FeeService,
        private readonly ledgerService: LedgerService,
    ) { }

    async execute(createData: Prisma.TransactionUncheckedCreateInput): Promise<Transaction> {
        return await this.prisma.$transaction(
            async (tx) => {
                // Step 1: Sender wallet validate
                const senderWallet = await tx.wallet.findUnique({
                    where: { id: createData.senderWalletId! },
                    select: { id: true, balance: true, currency: true, isActive: true },
                });

                if (!senderWallet) {
                    throw new RpcException({ statusCode: 404, error: 'SENDER_WALLET_NOT_FOUND' });
                }
                if (!senderWallet.isActive) {
                    throw new RpcException({ statusCode: 400, error: 'SENDER_WALLET_INACTIVE' });
                }

                // Step 2: Fee calculation
                const txType =
                    createData.type === 'INTERNATIONAL_TRANSFER' ? 'INTERNATIONAL'
                        : createData.type === 'PAYROLL_DISBURSEMENT' ? 'PAYROLL'
                            : 'INTERNAL';

                const transferAmount = parseFloat(createData.amount.toString());
                const fee = this.feeService.calculateFee(txType, transferAmount, createData.currency);
                const totalRequired = transferAmount + fee.feeAmount;

                // Step 3: Balance check
                const balance = parseFloat(senderWallet.balance.toString());
                if (balance < totalRequired) {
                    throw new RpcException({
                        statusCode: 400,
                        error: 'INSUFFICIENT_FUNDS',
                        message: 'Insufficient funds',
                    });
                }

                // Step 4: Debit sender
                await tx.wallet.update({
                    where: { id: createData.senderWalletId! },
                    data: { balance: { decrement: totalRequired } },
                });

                // Step 5: Credit recipient
                const creditAmount = createData.toAmount ?? createData.amount;
                await tx.wallet.update({
                    where: { id: createData.recipientWalletId! },
                    data: { balance: { increment: creditAmount } },
                });

                // Step 6: Create transaction directly as COMPLETED
                const existingMeta =
                    typeof createData.metadata === 'object' && createData.metadata !== null
                        ? createData.metadata : {};

                const transaction = await tx.transaction.create({
                    data: {
                        ...createData,
                        status: 'COMPLETED',
                        completedAt: new Date(),
                        metadata: {
                            ...existingMeta,
                            feeAmount: fee.feeAmount,
                            feeCurrency: fee.feeCurrency,
                            feeAccountCode: fee.feeAccountCode,
                            totalDebited: totalRequired,
                        },
                    },
                });

                // Step 7: Write ledger entries
                await this.ledgerService.writeLedgerEntries(tx, transaction);

                return transaction;
            },
            {
                isolationLevel: 'Serializable',
                timeout: 15_000,
            },
        );
    }
}