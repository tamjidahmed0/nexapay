import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { EncryptionService } from './encrypt.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports : [PrismaModule],
  providers: [UserService, EncryptionService],
  controllers: [UserController]
})
export class UserModule {}
