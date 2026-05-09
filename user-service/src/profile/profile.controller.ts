import { Controller } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { MessagePattern } from '@nestjs/microservices';

@Controller('profile')
export class ProfileController {
    constructor(
        private readonly profile: ProfileService
    ) { }

    @MessagePattern('get-user-profile')
    async getUserProfile(data: any) {
        return this.profile.getUserProfile(data.userId);
    }


}
