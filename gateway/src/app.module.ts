import { Module } from '@nestjs/common';
import { UserController } from './user/user.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MICROSERVICE } from './constants/constants';
import { WalletController } from './wallet/wallet.controller';
import { TransactionController } from './transaction/transaction.controller';
import { FxController } from './fx/fx.controller';
import { RedisModule } from './redis/redis.module';
import { SessionAuthGuard } from './guard/session.guard';
import { ConfigModule } from '@nestjs/config';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ClientsModule.register([
      {
        name: MICROSERVICE.USER_SERVICE,
        transport: Transport.TCP,
        options: {
          // host: 'user-service',
          port: 3001
        }
      },
      {
        name: MICROSERVICE.PAYMENT_SERVICE,
        transport: Transport.TCP,
        options: {
          // host: 'payment-service',
          port: 3002
        }
      }

    ]),
    RedisModule
  ],
  providers: [SessionAuthGuard],
  controllers: [UserController, WalletController, TransactionController, FxController],
})
export class AppModule { }
