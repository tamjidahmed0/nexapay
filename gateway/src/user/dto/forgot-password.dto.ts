import { IsEmail } from 'class-validator';

export class ForgotPassword {
    @IsEmail()
    email!: string;
}