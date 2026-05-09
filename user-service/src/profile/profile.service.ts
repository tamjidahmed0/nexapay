import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EncryptionService } from 'src/user/encrypt.service';

@Injectable()
export class ProfileService {

    constructor(
        private readonly prisma: PrismaService,
        private readonly encryption: EncryptionService,
    ) { }


    async getUserProfile(userId: string) {

        try {
            const user = await this.prisma.user.findUnique({
                where: {
                    id: userId
                },
                select: {
                    id: true,
                    email: true,
                    nameEncrypted: true
                }
            });

            return {
                id: user?.id,
                email: user?.email,
                name: user?.nameEncrypted ? this.encryption.decrypt(user.nameEncrypted) : null
            }

        } catch (error) {
            console.log(error);
        }

    }


}
