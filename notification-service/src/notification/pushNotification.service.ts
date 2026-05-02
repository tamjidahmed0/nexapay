import { Injectable } from "@nestjs/common";
import * as admin from 'firebase-admin';

@Injectable()
export class PushNotificationService {
    async sendPushNotification({
        fcmToken,
        title,
        body,
    }: {
        fcmToken: string;
        title: string;
        body: string;
    }) {
        await admin.messaging().send({
            token: fcmToken,
            notification: { title, body },
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'nexapay_transactions',
                    priority: 'max',
                    defaultVibrateTimings: true,
                    vibrateTimingsMillis: [0, 500, 200, 500],
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                    },
                },
                headers: {
                    'apns-priority': '10',
                },
            },
        });
    }
}