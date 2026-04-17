import { Injectable } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';
import { CreateInternalTransferPayload } from './interface/CreateInternalTransfer';
import { PrismaService } from 'src/prisma/prisma.service';
import { RpcException } from '@nestjs/microservices';
import { TransferExecutor } from './transfer.executor.service';

@Injectable()
export class TransactionService {

    constructor(
        private readonly idempotency: IdempotencyService,
        private prisma: PrismaService,
        private readonly transferExecutor: TransferExecutor
    ) { }



    async createInternalTransfer(
        dto: CreateInternalTransferPayload,
    ) {

        // Step 1: Idempotency check
        const idempotencyResult = await this.idempotency.acquireOrReplay(
            dto.idempotencyKey,
            dto.senderUserId,
            dto,
        );

        // Replay — return cached response, no processing
        // if (!idempotencyResult.isNew) {
        //     this.logger.log({
        //         requestId,
        //         event: 'transaction.replay',
        //         key: dto.idempotencyKey,
        //     });
        //     return idempotencyResult.cachedResponse;
        // }

        try {
            // Step 2: Validate wallets
            const [senderWallet, recipientWallet] = await Promise.all([
                this.prisma.wallet.findUnique({ where: { id: dto.senderWalletId } }),
                this.prisma.wallet.findUnique({ where: { id: dto.recipientWalletId } }),
            ]);


            if (!senderWallet) {
                throw new RpcException({
                    statusCode: 404,
                    error: 'SENDER_WALLET_NOT_FOUND',
                    message: 'sender wallet not found'
                });
            }
            if (!recipientWallet) {
                throw new RpcException({
                    statusCode: 404,
                    error: 'RECIPIENT_WALLET_NOT_FOUND',
                    message: 'Recipent wallet not found'
                });
            }

            if (!senderWallet.isActive) {
                throw new RpcException({
                    statusCode: 403,
                    error: 'SENDER_WALLET_INACTIVE',
                    message: 'sender wallet inactive'
                });
            }
            if (!recipientWallet.isActive) {
                throw new RpcException({
                    statusCode: 403,
                    error: 'RECIPIENT_WALLET_INACTIVE',
                    message: 'Recipent wallet inactive'
                });
            }

            if (senderWallet.currency !== dto.currency) {
                throw new RpcException({
                    statusCode: 400,
                    error: 'SENDER_CURRENCY_MISMATCH',
                    message: `Sender wallet currency (${senderWallet.currency}) does not match transfer currency (${dto.currency})`,
                });
            }

            if (recipientWallet.currency !== dto.currency) {
                throw new RpcException({
                    statusCode: 400,
                    error: 'RECIPIENT_CURRENCY_MISMATCH',
                    message: `Recipient wallet currency (${recipientWallet.currency}) does not match transfer currency (${dto.currency})`,
                });
            }

            if (dto.senderWalletId === dto.recipientWalletId) {
                throw new RpcException({
                    statusCode: 400,
                    error: 'SELF_TRANSFER_NOT_ALLOWED',
                    message: 'Sender and recipient wallets must be different',
                });
            }

            // Step 3: Create transaction record
            const transaction = await this.prisma.transaction.create({
                data: {
                    type: 'INTERNAL_TRANSFER',
                    status: 'PENDING',
                    senderWalletId: dto.senderWalletId,
                    senderUserId: dto.senderUserId,
                    recipientWalletId: dto.recipientWalletId,
                    recipientUserId: dto.recipientUserId,
                    amount: dto.amount,
                    currency: dto.currency,
                    metadata: dto.note ? { note: dto.note } : undefined,
                },
            });
            await this.transferExecutor.execute(transaction.id)

            const completed = await this.prisma.transaction.findUniqueOrThrow({
                where: { id: transaction.id },
            });

            const response = this.formatTransaction(completed);

            return response

            // Step 4: Execute saga
            // await this.saga.execute(transaction.id);

            // // Fetch final state
            // const completed = await this.prisma.transaction.findUniqueOrThrow({
            //     where: { id: transaction.id },
            // });

            // const response = this.formatTransaction(completed);

            // // Step 5: Cache response for future replays
            // await this.idempotency.markCompleted(
            //     dto.idempotencyKey,
            //     transaction.id,
            //     response,
            //     201,
            // );

            // return response;
        } catch (err: any) {
            await this.idempotency.markFailed(dto.idempotencyKey, err.message);
            throw err;
        }
    }




    private formatTransaction(tx: any) {
        const meta = (tx.metadata as any) ?? {};

        return {
            id: tx.id,
            type: tx.type,
            status: tx.status,
            senderWalletId: tx.senderWalletId,
            recipientWalletId: tx.recipientWalletId,
            amount: tx.amount?.toString(),
            currency: tx.currency,
            fxRate: tx.fxRate?.toString() ?? null,
            fromCurrency: tx.fromCurrency ?? null,
            toCurrency: tx.toCurrency ?? null,
            toAmount: tx.toAmount?.toString() ?? null,
            fee: meta.feeAmount != null
                ? {
                    amount: meta.feeAmount.toString(),
                    currency: meta.feeCurrency ?? tx.currency,
                    accountCode: meta.feeAccountCode ?? null,
                }
                : null,
            totalDebited: meta.totalDebited != null
                ? meta.totalDebited.toString()
                : tx.amount?.toString(),
            note: meta.note ?? null,
            failureReason: tx.failureReason ?? null,
            createdAt: tx.createdAt,
            completedAt: tx.completedAt ?? null,
        };
    }

}
