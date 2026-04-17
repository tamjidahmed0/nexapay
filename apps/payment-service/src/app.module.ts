import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { WalletModule } from './wallet/wallet.module';
import { TransactionModule } from './transaction/transaction.module';
import { ConfigModule } from '@nestjs/config';



@Module({
  imports: [
    ConfigModule.forRoot(),
    PrismaModule,
    WalletModule,
    TransactionModule
  ],

})
export class AppModule { }
