import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { Prisma } from 'generated/prisma/client';
import { firstValueFrom } from 'rxjs';
import { MICROSERVICE } from 'src/constants/constants';

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




    private formatWallet(wallet: any) {
        return {
            id: wallet.id,
            userId: wallet.userId,
            currency: wallet.currency,
            balance: wallet.balance.toString(),
            ledgerAccountCode: wallet.ledgerAccountCode,
            isActive: wallet.isActive,
            createdAt: wallet.createdAt,
            updatedAt: wallet.updatedAt,
        };
    }



}
