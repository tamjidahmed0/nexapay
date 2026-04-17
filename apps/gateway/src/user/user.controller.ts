import { Body, Controller, HttpException, Inject, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { MICROSERVICE } from 'src/constants/constants';
import { CreateAccountDto } from './dto/create-account.dto';
import { catchError, firstValueFrom } from 'rxjs';

@Controller('user')
export class UserController {
    constructor(
        @Inject(MICROSERVICE.USER_SERVICE) private readonly userClient: ClientProxy
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


}
