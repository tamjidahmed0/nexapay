import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
    constructor(
        private readonly wallet: WalletService
    ) { }


    @MessagePattern('create-wallet')
    async createWallet(@Payload() dto) {
        const { userId, currency } = dto
        return this.wallet.createWallet(userId, currency)
    }

    @MessagePattern('get-wallets')
    async getWallets(@Payload() userId: string) {
        return this.wallet.getUserWallets(userId)
    }

    @MessagePattern('get-wallet')
    async getWallet(@Payload() walletId: string) {
        return this.wallet.getWallet(walletId)
    }

    @MessagePattern('get-balances')
    async getBalances(@Payload() userId) {
        return this.wallet.getUserBalances(userId)
    }

    @MessagePattern('get-balance')
    async getBalance(@Payload() { walletId }) {
        return this.wallet.getBalance(walletId)
    }

}
