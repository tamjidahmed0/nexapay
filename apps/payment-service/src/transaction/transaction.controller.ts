import { Controller } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller('transaction')
export class TransactionController {
    constructor(
        private readonly transactionService: TransactionService
    ){}



    @MessagePattern('create-internal-transfer')
    async createInternalTransfer(@Payload() dto ){
        return this.transactionService.createInternalTransfer(dto)
    }


}
