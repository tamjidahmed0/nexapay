import { Body, Controller, DefaultValuePipe, Get, Inject, Param, ParseIntPipe, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { MICROSERVICE } from 'src/constants/constants';
import { CreateInternalTransferDto } from './dto/create-internal-transfer';
import { CreateInternationalTransferDto } from './dto/international-transfer';

@Controller('transaction')
export class TransactionController {

    constructor(
        @Inject(MICROSERVICE.PAYMENT_SERVICE) private readonly paymentClient: ClientProxy
    ) { }



    @Post('internal')
    async createInternalTransaction(@Body() dto: CreateInternalTransferDto) {
        return this.paymentClient.send('create-internal-transfer', dto)
    }

    @Post('international')
    createInternational(
        @Body() dto: CreateInternationalTransferDto,
    ) {

        return this.paymentClient.send('create-international-transfer', dto)
    }


    @Get(':id')
    getTransaction(@Param('id', ParseUUIDPipe) id: string) {
        return this.paymentClient.send('get-user-transaction', id)
    }


    @Get('user/:userId')
    getUserTransactions(
        @Param('userId', ParseUUIDPipe) userId: string,
        @Query('cursor') cursor?: string,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
    ) {

        return this.paymentClient.send('get-user-transactions', { userId, cursor, limit })


    }


}
