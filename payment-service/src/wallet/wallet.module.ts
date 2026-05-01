import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
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
  providers: [WalletService],
  controllers: [WalletController]
})
export class WalletModule { }
