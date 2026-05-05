import { Inject, Injectable } from '@nestjs/common';
import { CreateUserPayload, ForgotPassword, LoginPayload, PassResetOtp, VerifyOtpPayload } from './interface/interface';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PrismaService } from 'src/prisma/prisma.service';
import { EncryptionService } from './encrypt.service';
import { Redis } from 'ioredis';
import * as crypto from 'crypto';

import * as bcrypt from 'bcrypt';
import { MICROSERVICE } from 'src/constants/constants';
import { firstValueFrom } from 'rxjs';


const OTP_TTL_SECONDS = 300;       // 5 min



@Injectable()
export class UserService {

    constructor(
        private readonly prisma: PrismaService,
        private readonly encryption: EncryptionService,
        @Inject('REDIS_CLIENT') private readonly redis: Redis,
        @Inject(MICROSERVICE.NOTIFICATION_SERVICE) private notificationClient: ClientProxy,
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

        const otp = this.generateOtp();

        const passwordHash = await bcrypt.hash(dto.password, 12);
        const otpHash = await bcrypt.hash(otp, 10);

        await this.redis.set(
            otpKey,
            JSON.stringify({
                otpHash,
                payload: { ...dto, password: passwordHash },
            }),
            'EX',
            OTP_TTL_SECONDS,
        );

        await firstValueFrom(
            this.notificationClient.send('send_otp_mail', {
                to: dto.email,
                subject: 'NexaPay Verification Code',
                template: 'otp',
                name: dto.name,
                otp: otp
            })
        );

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

        const stored: { otpHash: string; payload: CreateUserPayload } =
            JSON.parse(raw);

        const isOtpValid = await bcrypt.compare(dto.otp, stored.otpHash);


        if (!isOtpValid) {
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
                password: payload.password,
                phoneEncrypted: payload.phone ? this.encryption.encrypt(payload.phone) : null,
                nationalIdEncrypted: payload.nationalId
                    ? this.encryption.encrypt(payload.nationalId)
                    : null,
                encryptionKeyId: process.env.ENCRYPTION_KEY_ID ?? 'kek-v1',
            },
        });

        return {
            user: this.formatUser(user),
        };
    }


    async forgotPassword(dto: ForgotPassword) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (!existing) {
            throw new RpcException({
                statusCode: 409,
                error: 'EMAIL_NOT_EXISTS',
                message: `An account with email ${dto.email} not exists.`,
            });
        }

        const otpKey = `otp:forgot:${dto.email}`;

        const otp = this.generateOtp();
        const otpHash = await bcrypt.hash(otp, 10);

        await this.redis.set(
            otpKey,
            JSON.stringify({
                otpHash,
                payload: { ...dto },
            }),
            'EX',
            OTP_TTL_SECONDS,
        );

        await firstValueFrom(
            this.notificationClient.send('send_otp_mail', {
                to: dto.email,
                subject: 'Reset your NexaPay password',
                template: 'forgot-password',
                name: this.encryption.decrypt(existing.nameEncrypted),
                otp: otp
            })
        );

        console.log(`[OTP] ${dto.email} → ${otp}`);

        return { message: 'OTP sent. Verify within 5 minutes.', email: dto.email };
    }




    async verifyResetOtp(dto: PassResetOtp) {
        const otpKey = `otp:forgot:${dto.email}`;
        const raw = await this.redis.get(otpKey);

        if (!raw) {
            throw new RpcException({
                statusCode: 404,
                error: 'OTP_NOT_FOUND',
                message: 'OTP expired or never issued.',
            });
        }

        const stored: { otpHash: string } = JSON.parse(raw);

        const isOtpValid = await bcrypt.compare(dto.otp, stored.otpHash);


        if (!isOtpValid) {
            const ttl = await this.redis.ttl(otpKey);
            await this.redis.set(otpKey, JSON.stringify(stored), 'EX', ttl);

            throw new RpcException({
                statusCode: 400,
                error: 'INVALID_OTP',
                message: `Invalid OTP.`,
            });
        }


        await this.redis.del(otpKey);


        const resetToken = crypto.randomUUID();
        await this.redis.set(
            `reset:${resetToken}`,
            dto.email,
            'EX',
            600, // 10 min
        );
        return { resetToken };


    }


    async resetPassword(dto: { resetToken: string; newPassword: string }) {
        const email = await this.redis.get(`reset:${dto.resetToken}`);

        if (!email) {
            throw new RpcException({
                statusCode: 400,
                error: 'INVALID_RESET_TOKEN',
                message: 'Reset token expired or invalid.',
            });
        }

        const hashed = await bcrypt.hash(dto.newPassword, 12);

        await this.prisma.user.update({
            where: { email },
            data: { password: hashed },
        });

        await this.redis.del(`reset:${dto.resetToken}`);

        return { message: 'Password reset successful.' };
    }




    async login(dto: LoginPayload) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (!user) {
            throw new RpcException({
                statusCode: 401,
                error: 'INVALID_CREDENTIALS',
                message: 'Invalid credentials.',
            });
        }



        const isMatch = await bcrypt.compare(dto.password, user.password);
        if (!isMatch) {
            throw new RpcException({
                statusCode: 401,
                error: 'INVALID_CREDENTIALS',
                message: 'Invalid credentials.',
            });
        }

        await this.prisma.user.update({
            where: {
                id: user.id
            },
            data: {
                fcmToken: dto.fcmToken
            }
        })


        return {
            user: this.formatUser(user),
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
            select: { id: true, nameEncrypted: true, fcmToken: true },
        });

        return users.map((u) => ({
            id: u.id,
            name: this.encryption.decrypt(u.nameEncrypted),
            fcmToken: u.fcmToken
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
