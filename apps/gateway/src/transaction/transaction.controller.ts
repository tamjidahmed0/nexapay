import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { MICROSERVICE } from 'src/constants/constants';
import { CreateInternalTransferDto } from './dto/create-internal-transfer';

@Controller('transaction')
export class TransactionController {

    constructor(
        @Inject(MICROSERVICE.PAYMENT_SERVICE) private readonly paymentClient: ClientProxy
    ) { }



    @Post('internal')
    async createInternalTransaction(@Body() dto: CreateInternalTransferDto) {
        return this.paymentClient.send('create-internal-transfer', dto)
    }


}
