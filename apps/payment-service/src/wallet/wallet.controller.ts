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

}
