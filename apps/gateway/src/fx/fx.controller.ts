import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { MICROSERVICE } from 'src/constants/constants';
import { CreateQuoteDto } from './dto/create-quote.dto';

@Controller('fx')
export class FxController {

    constructor(
        @Inject(MICROSERVICE.PAYMENT_SERVICE) private readonly fxClient: ClientProxy
    ) { }



    @Post('create')
    createQuote(@Body() dto: CreateQuoteDto) {
        return this.fxClient.send('create-quote', dto)
    }



}
