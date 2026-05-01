import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { IdempotencyService } from './idempotency.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TransferExecutor } from './transfer.executor.service';
import { FeeService } from './fee.service';
import { LedgerService } from './ledger.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MICROSERVICE } from 'src/constants/constants';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: MICROSERVICE.USER_SERVICE,
        transport: Transport.TCP,
        options: {
          host: 'user-service',
          port: 3001
        }
      },
    ]),
    PrismaModule
  ],
  providers: [TransactionService, IdempotencyService, TransferExecutor, FeeService, LedgerService],
  controllers: [TransactionController]
})
export class TransactionModule { }
