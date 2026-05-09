import { Controller, Get, Inject, Param, Req, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { MICROSERVICE } from 'src/constants/constants';
import { SessionAuthGuard } from 'src/guard/session.guard';

@Controller('profile')
export class ProfileController {

    constructor(
        @Inject(MICROSERVICE.USER_SERVICE) private readonly userClient: ClientProxy
    ) { }


    @Get('me')
    @UseGuards(SessionAuthGuard)
    async getUseProfile(@Req() req: any) {
        const userId = req.userId
        return this.userClient.send('get-user-profile', { userId })
    }

}
