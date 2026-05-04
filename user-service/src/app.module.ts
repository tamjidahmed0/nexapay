import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MICROSERVICE } from './constants/constants';


@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), UserModule, PrismaModule, RedisModule,
  ClientsModule.register({
    isGlobal: true,
    clients: [
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
  ]

})
export class AppModule { }
