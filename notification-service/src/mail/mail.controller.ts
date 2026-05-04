import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OtpMailService } from './otpMail.service';

@Controller('mail')
export class MailController {
    constructor(
        private readonly otpMailService: OtpMailService
    ){}


    @MessagePattern('send_otp_mail')
    async sendOtpMail(@Payload() dto) {
        return this.otpMailService.sendOtpEmail(dto)
    }

}
