import { Injectable } from "@nestjs/common";
import { MailerService } from '@nestjs-modules/mailer';


@Injectable()
export class OtpMailService {
    constructor(private mailerService: MailerService) { }

    async sendOtpEmail(dto: { to: string, name: string, otp: string, subject: string, template:string }) {
        await this.mailerService.sendMail({
            to: dto.to,
            from: `"NexaPay" ${dto.to}`,
            subject: dto.subject,
            template: dto.template,
            context: {
                name: dto.name,
                otp: dto.otp,
                expiryMinutes: 5,
                supportEmail: 'support@nexapay.com',
                email: dto.to,
            },
        });

        return { success: true };
    }

} 