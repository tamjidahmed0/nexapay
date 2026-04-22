import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { WalletModule } from './wallet/wallet.module';
import { TransactionModule } from './transaction/transaction.module';
import { ConfigModule } from '@nestjs/config';
import { FxModule } from './fx/fx.module';
import { RedisModule } from './redis/redis.module';




@Module({
  imports: [
    ConfigModule.forRoot(),
    PrismaModule,
    WalletModule,
    TransactionModule,
    FxModule,
    RedisModule
  ],

})
export class AppModule { }
