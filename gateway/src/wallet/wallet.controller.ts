import { Body, Controller, Inject, Post, Get, Req, UseGuards, Param } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { MICROSERVICE } from 'src/constants/constants';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { SessionAuthGuard } from 'src/guard/session.guard';

@Controller('wallet')
export class WalletController {
    constructor(
        @Inject(MICROSERVICE.PAYMENT_SERVICE) private readonly paymentClient: ClientProxy
    ) { }



    @Post('create')
    @UseGuards(SessionAuthGuard)
    async createWallet(@Body() dto: CreateWalletDto, @Req() req) {
        const userId = req.userId;
        return this.paymentClient.send('create-wallet', { userId, ...dto })
    }

    @Get('get-wallets')
    @UseGuards(SessionAuthGuard)
    async getWallets(@Req() req) {
        const userId = req.userId;
        return this.paymentClient.send('get-wallets', userId)
    }


    @Get('primary')
    @UseGuards(SessionAuthGuard)
    async getPrimaryBalance(@Req() req) {
        const userId = req.userId;
        return this.paymentClient.send('get-primary-balance', { userId })
    }

    @Get('get-wallet/:walletId')
    @UseGuards(SessionAuthGuard)
    async getWallet(@Param('walletId') walletId, @Req() req) {
        const userId = req.userId;
        return this.paymentClient.send('get-wallet', { walletId, userId })
    }

    @Get('get-balances')
    @UseGuards(SessionAuthGuard)
    async getBalances(@Req() req) {
        const userId = req.userId;
        return this.paymentClient.send('get-balances', userId)
    }

    @Get('get-balance/:walletId')
    @UseGuards(SessionAuthGuard)
    async getBalance(@Param('walletId') walletId, @Req() req) {
        const userId = req.userId;
        return this.paymentClient.send('get-balance', { walletId, userId })
    }



}
