import { Body, Controller, Inject, Post, Headers } from '@nestjs/common';
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


}
