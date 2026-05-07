import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class ResetPassword {
    @IsUUID()
    @IsNotEmpty()
    resetToken!: string;

    @IsString()
    @IsNotEmpty()
    newPassword!: string
}