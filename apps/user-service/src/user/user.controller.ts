import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';

@Controller('user')
export class UserController {

    constructor(
        private readonly userService: UserService
    ) { }

    @MessagePattern('create-user')
    async createUser(@Payload() dto) {
        return this.userService.createUser(dto)
    }



    @MessagePattern('user-exists')
    async userExists(@Payload() dto) {
        const user = await this.userService.userExists(dto);
        return !!user;
    }


}
