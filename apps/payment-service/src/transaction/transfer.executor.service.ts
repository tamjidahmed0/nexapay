import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { PrismaService } from "src/prisma/prisma.service";
import { FeeService } from "./fee.service";

@Injectable()
export class TransferExecutor {

    constructor(
        private readonly prisma: PrismaService,
        private readonly feeService: FeeService
    ) { }


    async execute(transactionId: string): Promise<void> {
        await this.prisma.$transaction(
            async (tx) => {
                // Step 1: Transaction fetch
                const transaction = await tx.transaction.findUniqueOrThrow({
                    where: { id: transactionId },
                });

                if (transaction.status !== 'PENDING') {
                    throw new RpcException({
                        statusCode: 400,
                        error: 'INVALID_STATUS',
                        message: `Transaction is already ${transaction.status}`,
                    });
                }

                // Step 2: Sender wallet lock + validate
                const senderWallet = await tx.wallet.findUnique({
                    where: { id: transaction.senderWalletId! },
                    select: { id: true, balance: true, currency: true, isActive: true },
                });

                if (!senderWallet) {
                    throw new RpcException({ statusCode: 404, error: 'SENDER_WALLET_NOT_FOUND' });
                }

                if (!senderWallet.isActive) {
                    throw new RpcException({ statusCode: 400, error: 'SENDER_WALLET_INACTIVE' });
                }

                // Step 3: Fee calculation
                const txType = transaction.type === 'INTERNATIONAL_TRANSFER' ? 'INTERNATIONAL': transaction.type === 'PAYROLL_DISBURSEMENT' ? 'PAYROLL': 'INTERNAL';

                const transferAmount = parseFloat(transaction.amount.toString());
                const fee = this.feeService.calculateFee(txType, transferAmount, transaction.currency);
                const totalRequired = transferAmount + fee.feeAmount;

                // Step 4: Balance check
                const balance = parseFloat(senderWallet.balance.toString());
                if (balance < totalRequired) {
                    throw new RpcException({
                        statusCode: 400,
                        error: 'INSUFFICIENT_FUNDS',
                        message: 'Insufficient funds',
                        available: balance.toFixed(8),
                        required: totalRequired.toFixed(8),
                    });
                }

                // Step 5: Debit sender
                await tx.wallet.update({
                    where: { id: transaction.senderWalletId! },
                    data: { balance: { decrement: totalRequired } },
                });

                // Step 6: Credit recipient
                await tx.wallet.update({
                    where: { id: transaction.recipientWalletId! },
                    data: { balance: { increment: transaction.toAmount ?? transaction.amount } },
                });

                // Step 7: Transaction complete
                const existingMeta = typeof transaction.metadata === 'object' && transaction.metadata !== null
                    ? transaction.metadata : {};

                await tx.transaction.update({
                    where: { id: transactionId },
                    data: {
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

            },
            {
                isolationLevel: 'Serializable',
                timeout: 15_000,
            },
        );


    }




}