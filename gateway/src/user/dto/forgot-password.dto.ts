import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPassword {
    @IsEmail()
    @IsNotEmpty()
    email!: string;
}