import { IsEmail, IsString } from 'class-validator';

export class VerifyResetOtp {
    @IsEmail()
    email!: string;

    @IsString()
    otp!: string;
}