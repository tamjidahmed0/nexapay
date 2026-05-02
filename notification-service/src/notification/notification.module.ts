import { Module, OnModuleInit } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import * as admin from 'firebase-admin';
import { PushNotificationService } from './pushNotification.service';


@Module({
    controllers: [NotificationController],
    providers: [PushNotificationService]
})
export class NotificationModule implements OnModuleInit {
    onModuleInit() {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
    }
}
