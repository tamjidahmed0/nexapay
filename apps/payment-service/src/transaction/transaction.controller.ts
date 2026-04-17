import { Controller } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller('transaction')
export class TransactionController {
    constructor(
        private readonly transactionService: TransactionService
    ) { }



    @MessagePattern('create-internal-transfer')
    async createInternalTransfer(@Payload() dto) {
        return this.transactionService.createInternalTransfer(dto)
    }

    @MessagePattern('get-user-transactions')
    async getUserTransactions(@Payload() dto) {
        const { userId, cursor, limit } = dto
        return this.transactionService.getUserTransactions({ userId, cursor, limit })
    }

    @MessagePattern('get-user-transaction')
    async getUserTransaction(@Payload() transactionId) {
        return this.transactionService.getTransaction(transactionId)
    }


}
