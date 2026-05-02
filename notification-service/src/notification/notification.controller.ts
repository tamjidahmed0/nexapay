import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PushNotificationService } from './pushNotification.service';

@Controller('notification')
export class NotificationController {

    constructor (
        private readonly pushNotification : PushNotificationService
    ){}


    @MessagePattern('send_notification')
    async handleNotification(@Payload() data: {
        fcmToken: string;
        title: string;
        body: string;
    }) {
        await this.pushNotification.sendPushNotification(data);
        return { success: true };
    }
}
