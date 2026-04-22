import { Body, Controller, Inject, Post, Headers, Get } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { MICROSERVICE } from 'src/constants/constants';
import { CreateWalletDto } from './dto/create-wallet.dto';

@Controller('wallet')
export class WalletController {
    constructor(
        @Inject(MICROSERVICE.PAYMENT_SERVICE) private readonly paymentClient: ClientProxy
    ) { }



    @Post('create')
    async createWallet(@Body() dto: CreateWalletDto, @Headers('user-id') userId: string,) {
        return this.paymentClient.send('create-wallet', { userId, ...dto })
    }

    @Get('get-wallets')
    async getWallets(@Headers('user-id') userId: string) {
        return this.paymentClient.send('get-wallets', userId)
    }

    @Get('get-wallet')
    async getWallet(@Headers('wallet-id') walletId: string) {
        return this.paymentClient.send('get-wallet', walletId)
    }

    @Get('get-balances')
    async getBalances(@Headers('user-id') userId) {
        return this.paymentClient.send('get-balances', userId)
    }

    @Get('get-balance')
    async getBalance(@Headers('wallet-id') walletId) {
        return this.paymentClient.send('get-balance', { walletId })
    }



}
