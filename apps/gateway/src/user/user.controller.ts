import { Body, Controller, HttpException, Inject, Post, Req, Session } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { MICROSERVICE } from 'src/constants/constants';
import { CreateAccountDto } from './dto/create-account.dto';
import { catchError, firstValueFrom } from 'rxjs';
import { UserLoginDto } from './dto/login.dto';
import { Redis } from 'ioredis';
import * as crypto from 'crypto';
import session from 'express-session';


const SESSION_TTL = 60 * 60 * 24;

@Controller('user')
export class UserController {
    constructor(
        @Inject(MICROSERVICE.USER_SERVICE) private readonly userClient: ClientProxy,
    ) { }


    @Post('create')
    async createUser(@Body() dto: CreateAccountDto) {

        try {
            return await firstValueFrom(this.userClient.send('create-user', dto));
        } catch (error: any) {
            const statusMap: Record<string, number> = {
                EMAIL_ALREADY_EXISTS: 409,
                NOT_FOUND: 404,
                UNAUTHORIZED: 401,
                VALIDATION_ERROR: 400,
            };

            const status = statusMap[error.error] ?? 500;
            throw new HttpException(
                { error: error.error, message: error.message },
                status,
            );
        }

    }

    @Post('verify-otp')
    async verifyOtp(@Body() dto, @Session() session: any) {
        const result = await firstValueFrom(this.userClient.send('verify-otp', dto));
        session.user = result.user.id;

        return {
            message: 'Account created.',
        }


    }

    @Post('login')
    async login(@Body() dto: UserLoginDto, @Session() session: any) {
        const result = await firstValueFrom(this.userClient.send('login', dto));
        session.user = result.user.id;

        return {
            message: 'Login successful',
        }

    }





}
