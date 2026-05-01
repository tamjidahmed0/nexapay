import { Body, Controller, DefaultValuePipe, Get, Inject, Param, ParseIntPipe, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { MICROSERVICE } from 'src/constants/constants';
import { CreateInternalTransferDto } from './dto/create-internal-transfer';
import { CreateInternationalTransferDto } from './dto/international-transfer';
import { SessionAuthGuard } from 'src/guard/session.guard';

@Controller('transaction')
export class TransactionController {

    constructor(
        @Inject(MICROSERVICE.PAYMENT_SERVICE) private readonly paymentClient: ClientProxy
    ) { }



    @Post('internal')
    @UseGuards(SessionAuthGuard)
    async createInternalTransaction(@Body() dto: CreateInternalTransferDto, @Req() req) {
        const userId = req.userId;
        return this.paymentClient.send('create-internal-transfer', { userId, ...dto })
    }

    @Post('international')
    createInternational(
        @Body() dto: CreateInternationalTransferDto,
    ) {

        return this.paymentClient.send('create-international-transfer', dto)
    }


    @Get('user')
    @UseGuards(SessionAuthGuard)
    getUserTransactions(
        @Req() req,
        @Query('cursor') cursor?: string,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
    ) {
        const userId = req.userId

        return this.paymentClient.send('get-user-transactions', { userId, cursor, limit })


    }

    @Get(':id')
    getTransaction(@Param('id', ParseUUIDPipe) id: string) {
        return this.paymentClient.send('get-user-transaction', id)
    }





}
