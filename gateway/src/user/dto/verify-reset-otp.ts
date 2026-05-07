import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class VerifyResetOtp {
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @IsString()
    @IsNotEmpty()
    otp!: string;
}