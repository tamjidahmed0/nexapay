import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { IdempotencyService } from './idempotency.service';

@Module({
  providers: [TransactionService, IdempotencyService],
  controllers: [TransactionController]
})
export class TransactionModule {}
