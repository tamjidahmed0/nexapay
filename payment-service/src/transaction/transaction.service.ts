import { Inject, Injectable } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';
import { CreateInternalTransferPayload } from './interface/CreateInternalTransfer';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { TransferExecutor } from './transfer.executor.service';
import { CreateInternationalTransfer } from './interface/international-transfer';
import { MICROSERVICE } from 'src/constants/constants';
import { firstValueFrom } from 'rxjs';
import { getCurrencySymbol } from 'src/utils/currency.util';

@Injectable()
export class TransactionService {

    constructor(
        private readonly idempotency: IdempotencyService,
        private prisma: PrismaService,
        private readonly transferExecutor: TransferExecutor,
        @Inject(MICROSERVICE.USER_SERVICE) private accountClient: ClientProxy,
    ) { }



    async createInternalTransfer(
        dto: CreateInternalTransferPayload,
        userId: string,
        senderWalletId: string
    ) {

        console.log(userId)
        // Idempotency check
        const idempotencyResult = await this.idempotency.acquireOrReplay(
            dto.idempotencyKey,
            userId,
            dto,
        );


        // Replay — return cached response, no processing
        if (!idempotencyResult.isNew) {
            return idempotencyResult.cachedResponse;
        }



        try {

            const recipient = await firstValueFrom(
                this.accountClient.send('find_user_by_identifier', {
                    identifier: dto.recipientIdentifier,
                }),
            );


            const isUSerExist = await firstValueFrom(
                this.accountClient.send('user-exists', { userId }),
            )



            if (!isUSerExist) {
                console.log('sender not found')
                throw new RpcException({
                    statusCode: 404,
                    error: 'SENDER_USER_NOT_FOUND',
                    message: `Sender user with ID ${userId} not found`,
                });
            }



            if (!recipient) {
                throw new RpcException({
                    statusCode: 404,
                    error: 'USER_NOT_FOUND',
                    message: `No user found with identifier ${dto.recipientIdentifier}`,
                });
            }



            const [senderWallet, recipientWallet] = await Promise.all([
                this.prisma.wallet.findUnique({ where: { id: senderWalletId } }),
                this.prisma.wallet.findFirst({
                    where: {
                        userId: recipient.id,
                        currency: dto.currency,
                    },
                }),
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

            if (senderWalletId === recipientWallet.id) {
                throw new RpcException({
                    statusCode: 400,
                    error: 'SELF_TRANSFER_NOT_ALLOWED',
                    message: 'Sender and recipient wallets must be different',
                });
            }



            const completed = await this.transferExecutor.execute({
                type: 'INTERNAL_TRANSFER',
                senderWalletId,
                senderUserId: userId,
                recipientWalletId: recipientWallet.id,
                recipientUserId: recipient.id,
                amount: dto.amount,
                currency: dto.currency,
                metadata: dto.note ? { note: dto.note } : undefined,
            });


            const response = this.formatTransaction(completed);

            //Cache response for future replays
            await this.idempotency.markCompleted(
                dto.idempotencyKey,
                completed.id,
                response,
                201,
            );



            return response;
        } catch (err: any) {
            await this.idempotency.markFailed(dto.idempotencyKey, err.message);
            throw err;
        }
    }




    async createInternationalTransfer(
        dto: CreateInternationalTransfer,
    ) {
        const idempotencyResult = await this.idempotency.acquireOrReplay(
            dto.idempotencyKey,
            dto.senderUserId,
            dto,
        );

        if (!idempotencyResult.isNew) {
            return idempotencyResult.cachedResponse;
        }

        try {


            // Fetch the consumed quote for rate details
            const quote = await this.prisma.fXQuote.findUniqueOrThrow({
                where: { id: dto.fxQuoteId },
            });

            // Validate currency alignment with the quote
            if (quote.fromCurrency !== dto.fromCurrency) {
                throw new RpcException({ statusCode: 400, error: 'QUOTE_CURRENCY_MISMATCH' });
            }
            if (quote.toCurrency !== dto.toCurrency) {
                throw new RpcException({ statusCode: 400, error: 'QUOTE_CURRENCY_MISMATCH' });
            }
            if (parseFloat(quote.fromAmount.toString()) !== dto.amount) {
                throw new RpcException({
                    statusCode: 400,
                    error: 'QUOTE_AMOUNT_MISMATCH',
                    message: 'Transfer amount does not match the quoted amount.',
                    quotedAmount: quote.fromAmount.toString(),
                    requestedAmount: dto.amount,
                });
            }



            // Step 2: Consume FX quote atomically

            const now = new Date();
            const consumeResult = await this.prisma.fXQuote.updateMany({
                where: {
                    id: dto.fxQuoteId,
                    status: 'ACTIVE',
                    expiresAt: { gt: now },
                },
                data: {
                    status: 'USED',
                    usedAt: new Date(),
                },
            });

            if (consumeResult.count === 0) {
                // Zero rows updated — quote expired, already used, or not found
                const quote = await this.prisma.fXQuote.findUnique({
                    where: { id: dto.fxQuoteId },
                });

                if (!quote) {
                    throw new RpcException({
                        statusCode: 404,
                        error: 'FX_QUOTE_NOT_FOUND',
                        message: 'FX quote not found.',
                    });
                }
                if (quote.status === 'USED') {
                    throw new RpcException({
                        statusCode: 400,
                        error: 'FX_QUOTE_ALREADY_USED',
                        message: 'This FX quote has already been used for another transfer.',
                    });
                }
                // status=ACTIVE but expiresAt passed, or status=EXPIRED
                throw new RpcException({
                    statusCode: 400,
                    error: 'FX_QUOTE_EXPIRED',
                    message: 'FX quote has expired. Request a new quote and retry.',
                    expiredAt: quote.expiresAt,
                });
            }


            // Step 3: Validate wallets
            const [senderWallet, recipientWallet] = await Promise.all([
                this.prisma.wallet.findUnique({ where: { id: dto.senderWalletId } }),
                this.prisma.wallet.findUnique({ where: { id: dto.recipientWalletId } }),
            ]);



            if (!senderWallet) {
                throw new RpcException({
                    statusCode: 404,
                    error: 'SENDER_WALLET_NOT_FOUND',
                    message: 'Sender wallet not found',
                });
            }

            if (!recipientWallet) {
                throw new RpcException({
                    statusCode: 404,
                    error: 'RECIPIENT_WALLET_NOT_FOUND',
                    message: 'Recipient wallet not found',
                });
            }

            if (senderWallet.currency !== dto.fromCurrency) {
                throw new RpcException({
                    statusCode: 400,
                    error: 'SENDER_WALLET_CURRENCY_MISMATCH',
                    message: 'Sender wallet currency does not match the requested fromCurrency',
                });
            }

            if (recipientWallet.currency !== dto.toCurrency) {
                throw new RpcException({
                    statusCode: 400,
                    error: 'RECIPIENT_WALLET_CURRENCY_MISMATCH',
                    message: 'Recipient wallet currency does not match the requested toCurrency',
                });
            }

            // Step 4: Create transaction with locked rate recorded

            const completed = await this.transferExecutor.execute({
                type: 'INTERNATIONAL_TRANSFER',
                senderWalletId: dto.senderWalletId,
                senderUserId: dto.senderUserId,
                recipientWalletId: dto.recipientWalletId,
                recipientUserId: dto.recipientUserId,
                amount: dto.amount,
                currency: dto.fromCurrency,
                fxQuoteId: quote.id,
                fxRate: quote.rate,
                fromCurrency: dto.fromCurrency,
                toCurrency: dto.toCurrency,
                toAmount: quote.toAmount,
                metadata: dto.note ? { note: dto.note } : undefined,
            });


            const response = this.formatTransaction(completed);

            await this.idempotency.markCompleted(
                dto.idempotencyKey,
                completed.id,
                response,
                201,
            );

            return response;
        } catch (err: any) {
            await this.idempotency.markFailed(dto.idempotencyKey, err.message);
            throw err;
        }
    }



    async getUserTransactions({ userId, cursor, limit = 20 }) {
        const transactions = await this.prisma.transaction.findMany({
            where: {
                OR: [{ senderUserId: userId }, { recipientUserId: userId }],
            },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
            ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        });

        const hasNextPage = transactions.length > limit;
        const items = hasNextPage ? transactions.slice(0, limit) : transactions;


        const userIds = [
            ...new Set(
                items.flatMap((tx) =>
                    [tx.senderUserId, tx.recipientUserId].filter(Boolean),
                ),
            ),
        ];


        const users = await firstValueFrom(
            this.accountClient.send('get_users_by_ids', { ids: userIds }),
        );

        const userMap = new Map(users.map((u) => [u.id, u.name]));

        // return {
        //     items: items.map((tx) => ({
        //         ...this.formatTransaction(tx),
        //         isCredit: tx.recipientUserId === userId,
        //         senderName: tx.senderUserId === userId
        //             ? 'You'
        //             : (userMap.get(tx.senderUserId) ?? 'Unknown'),
        //         recipientName: tx.recipientUserId === userId
        //             ? 'You'
        //             : (userMap.get(tx.recipientUserId) ?? 'Unknown'),
        //     })),
        //     nextCursor: hasNextPage ? items[items.length - 1].id : null,
        //     hasNextPage,
        // };

        return {
            items: items.map((tx) => {
                const meta = (tx.metadata as any) ?? {};
                const isCredit = tx.recipientUserId === userId;

                return {
                    ...this.formatTransaction(tx),

                    fee:
                        tx.recipientUserId !== userId && meta.feeAmount != null
                            ? {
                                amount: meta.feeAmount.toString(),
                                currency: meta.feeCurrency ?? tx.currency,
                                accountCode: meta.feeAccountCode ?? null,
                            }
                            : null,

                    isCredit,

                    senderName:
                        tx.senderUserId === userId
                            ? 'You'
                            : userMap.get(tx.senderUserId) ?? 'Unknown',

                    recipientName:
                        tx.recipientUserId === userId
                            ? 'You'
                            : userMap.get(tx.recipientUserId) ?? 'Unknown',
                };
            }),

            nextCursor: hasNextPage ? items[items.length - 1].id : null,
            hasNextPage,
        };

    }



    async getTransaction(transactionId: string) {
        const transaction = await this.prisma.transaction.findUnique({
            where: { id: transactionId },
        });

        if (!transaction) {
            throw new RpcException({
                statusCode: 400,
                error: 'TRANSACTION_NOT_FOUND',
                message: `Transaction ${transactionId} not found.`,
            });
        }

        return this.formatTransaction(transaction);
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
            currencySymbol: getCurrencySymbol(tx.currency),
            fxRate: tx.fxRate?.toString() ?? null,
            fromCurrency: tx.fromCurrency ?? null,
            toCurrency: tx.toCurrency ?? null,
            toAmount: tx.toAmount?.toString() ?? null,
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
