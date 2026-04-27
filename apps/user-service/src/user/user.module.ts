import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { EncryptionService } from './encrypt.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TokenService } from './token.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        privateKey: config.get<string>('JWT_PRIVATE_KEY')?.replace(/\\n/g, '\n') ?? '',
        publicKey: config.get<string>('JWT_PUBLIC_KEY')?.replace(/\\n/g, '\n') ?? '',
        signOptions: {
          algorithm: 'RS256',
          expiresIn: config.get<number>('JWT_EXPIRES_IN') ?? 900,
        },
      }),
    }),
  ],
  providers: [UserService, EncryptionService, TokenService],
  controllers: [UserController]
})
export class UserModule { }
