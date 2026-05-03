import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { WalletModule } from './wallet/wallet.module';
import { TransactionModule } from './transaction/transaction.module';
import { ConfigModule } from '@nestjs/config';
import { FxModule } from './fx/fx.module';
import { RedisModule } from './redis/redis.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MICROSERVICE } from './constants/constants';




@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ClientsModule.register({
      isGlobal: true,
      clients: [
        {
          name: MICROSERVICE.USER_SERVICE,
          transport: Transport.TCP,
          options: {
            host: process.env.USER_SERVICE_HOST || '0.0.0.0',
            port: 3001
          }
        },
        {
          name: MICROSERVICE.NOTIFICATION_SERVICE,
          transport: Transport.RMQ,
          options: {
            urls: [process.env.RABBITMQ_URL || ''],
            queue: 'notification_queue',
            queueOptions: { durable: true },
          },
        },
      ]
    }),
    PrismaModule,
    WalletModule,
    TransactionModule,
    FxModule,
    RedisModule
  ],

})
export class AppModule { }
