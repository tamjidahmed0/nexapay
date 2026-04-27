import { Inject, Injectable } from '@nestjs/common';
import { CreateUserPayload, VerifyOtpPayload } from './interface/interface';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from 'src/prisma/prisma.service';
import { EncryptionService } from './encrypt.service';
import { Redis } from 'ioredis';
import * as crypto from 'crypto';
import { TokenService } from './token.service';

const OTP_TTL_SECONDS = 300;       // 5 min



@Injectable()
export class UserService {

    constructor(
        private readonly prisma: PrismaService,
        private readonly encryption: EncryptionService,
        private readonly tokenService: TokenService,
        @Inject('REDIS_CLIENT') private readonly redis: Redis,
    ) { }


    async initiateRegistration(dto: CreateUserPayload) {

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

        const otpKey = `otp:pending:${dto.email}`;
        const raw = await this.redis.get(otpKey);

        let otp: string;

        if (raw) {
            otp = JSON.parse(raw).otp;
        } else {
            otp = this.generateOtp();
            await this.redis.set(
                otpKey,
                JSON.stringify({ otp, payload: dto }),
                'EX',
                OTP_TTL_SECONDS,
            );
        }

        console.log(`[OTP] ${dto.email} → ${otp}`);

        return { message: 'OTP sent. Verify within 5 minutes.', email: dto.email };


    }



    async verifyAndCreateUser(dto: VerifyOtpPayload) {
        const otpKey = `otp:pending:${dto.email}`;
        const raw = await this.redis.get(otpKey);

        if (!raw) {
            throw new RpcException({
                statusCode: 404,
                error: 'OTP_NOT_FOUND',
                message: 'OTP expired or never issued.',
            });
        }

        const stored: { otp: string; payload: CreateUserPayload; attempts: number } =
            JSON.parse(raw);


        // Wrong OTP → increment attempt counter, keep remaining TTL
        if (stored.otp !== dto.otp) {
            const ttl = await this.redis.ttl(otpKey);
            await this.redis.set(otpKey, JSON.stringify(stored), 'EX', ttl);

            throw new RpcException({
                statusCode: 400,
                error: 'INVALID_OTP',
                message: `Invalid OTP.`,
            });
        }

        // OTP valid → delete key → create user
        await this.redis.del(otpKey);

        const { payload } = stored;
        const user = await this.prisma.user.create({
            data: {
                email: payload.email,
                nameEncrypted: this.encryption.encrypt(payload.name),
                phoneEncrypted: payload.phone ? this.encryption.encrypt(payload.phone) : null,
                nationalIdEncrypted: payload.nationalId
                    ? this.encryption.encrypt(payload.nationalId)
                    : null,
                encryptionKeyId: process.env.ENCRYPTION_KEY_ID ?? 'kek-v1',
            },
        });

        const accessToken = await this.tokenService.generateAccessToken(
            user.id,
            user.email,
        );

        return {
            user: this.formatUser(user),
            accessToken,
        };
    }











    async userExists(dto: { userId: string }) {
        const user = await this.prisma.user.findUnique({
            where: { id: dto.userId },
        });

        return user
    }



    async getUsersByIds(data: { ids: string[] }) {
        const users = await this.prisma.user.findMany({
            where: { id: { in: data.ids } },
            select: { id: true, nameEncrypted: true },
        });

        return users.map((u) => ({
            id: u.id,
            name: this.encryption.decrypt(u.nameEncrypted),
        }));
    }


    async findUserByIdentifier(identifier: string) {


        const isEmail = identifier.includes('@');
        const isUUID = /^[0-9a-f-]{36}$/.test(identifier);

        let user;

        if (isUUID) {
            user = await this.prisma.user.findUnique({ where: { id: identifier } });
        } else if (isEmail) {
            user = await this.prisma.user.findUnique({ where: { email: identifier } });
        }


        if (!user) {
            return null;
        }

        return {
            id: user.id,
            name: this.encryption.decrypt(user.nameEncrypted),
            email: user.email,
        };
    }



    private generateOtp(): string {
        // Cryptographically secure 6-digit OTP
        return String(crypto.randomInt(100_000, 999_999));
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
