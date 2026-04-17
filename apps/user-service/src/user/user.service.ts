import { Injectable } from '@nestjs/common';
import { CreateUserPayload } from './interface/interface';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from 'src/prisma/prisma.service';
import { EncryptionService } from './encrypt.service';

@Injectable()
export class UserService {

    constructor(
        private readonly prisma: PrismaService,
        private readonly encryption: EncryptionService
    ) { }


    async createUser(dto: CreateUserPayload) {

        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existing) {
            throw new RpcException({
                statusCode: 409,
                error: 'EMAIL_ALREADY_EXISTS',
                message: `An account with email ${dto.email} already exists.`,
            });
        }


        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                nameEncrypted: this.encryption.encrypt(dto.name),
                phoneEncrypted: dto.phone
                    ? this.encryption.encrypt(dto.phone)
                    : null,
                nationalIdEncrypted: dto.nationalId
                    ? this.encryption.encrypt(dto.nationalId)
                    : null,
                encryptionKeyId: process.env.ENCRYPTION_KEY_ID ?? 'kek-v1',
            },
        });



        return this.formatUser(user);





    }

    async userExists(dto : {userId:string}) {
        const user = await this.prisma.user.findUnique({
            where: { id: dto.userId },
        });

        return user
    }




    private formatUser(user: any) {
        return {
            id: user.id,
            email: user.email,
            encryptionKeyId: user.encryptionKeyId,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }


}
