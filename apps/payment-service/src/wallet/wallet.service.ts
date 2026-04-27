import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { Prisma } from 'generated/prisma/client';
import { firstValueFrom } from 'rxjs';
import { MICROSERVICE } from 'src/constants/constants';
import { getCurrencySymbol } from 'src/utils/currency.util';

@Injectable()
export class WalletService {

    constructor(
        private readonly prisma: PrismaService,
        @Inject(MICROSERVICE.USER_SERVICE) private readonly userClient: ClientProxy

    ) { }



    async createWallet(userId: string, dto: string) {

        const userExists = await firstValueFrom(
            this.userClient.send('user-exists', { userId })
        );

        if (!userExists) {
            throw new RpcException({
                statusCode: 404,
                error: 'USER_NOT_FOUND',
                message: `User not found`,
            });
        }


        const existing = await this.prisma.wallet.findUnique({
            where: { userId_currency: { userId, currency: dto } },
        });

        if (existing) {
            throw new RpcException({
                statusCode: 409,
                error: 'WALLET_ALREADY_EXISTS',
                message: `User already has a ${dto} wallet.`,
            });
        }

        // Cross-domain reference code — used by ledger-service to identify this wallet
        const ledgerAccountCode = `user:${userId}:${dto}`;

        const wallet = await this.prisma.wallet.create({
            data: {
                userId,
                currency: dto,
                balance: new Prisma.Decimal(0),
                ledgerAccountCode,
                isActive: true,
            },
        });


        return this.formatWallet(wallet);
    }


    async getUserWallets(userId: string) {

        const wallets = await this.prisma.wallet.findMany({
            where: { userId },
        });

        return wallets.map((w) => this.formatWallet(w));
    }


    async getWallet(walletId: string) {
        const wallet = await this.prisma.wallet.findUnique({
            where: { id: walletId },
        });

        if (!wallet) {
            throw new RpcException({
                statusCode: 404,
                error: 'WALLET_NOT_FOUND',
                message: `Wallet ${walletId} not found.`,
            });
        }

        return this.formatWallet(wallet);
    }


    async getUserBalances(userId: string) {
        const wallets = await this.prisma.wallet.findMany({
            where: { userId, isActive: true },
            select: {
                id: true,
                currency: true,
                balance: true,
                updatedAt: true,
            },
        });

        return wallets.map((w) => ({
            walletId: w.id,
            currency: w.currency,
            balance: w.balance.toString(),
            asOf: w.updatedAt,
        }));

    }


    async getBalance(walletId: string) {
        const wallet = await this.prisma.wallet.findUnique({
            where: { id: walletId },
            select: {
                id: true,
                userId: true,
                currency: true,
                balance: true,
                isActive: true,
                updatedAt: true,
            },
        });

        if (!wallet) {
            throw new RpcException({ statusCode: 404, error: 'WALLET_NOT_FOUND', message: `Wallet ${walletId} not found.` });
        }

        return {
            walletId: wallet.id,
            userId: wallet.userId,
            currency: wallet.currency,
            balance: wallet.balance.toString(),
            isActive: wallet.isActive,
            asOf: wallet.updatedAt,
        };
    }






    private formatWallet(wallet: any) {
        return {
            id: wallet.id,
            currency: wallet.currency,
            currencySymbol: getCurrencySymbol(wallet.currency),
            balance: wallet.balance.toString(),
            isActive: wallet.isActive,
            createdAt: wallet.createdAt,
            updatedAt: wallet.updatedAt,
        };
    }



}
