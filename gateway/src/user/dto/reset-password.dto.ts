import { IsString, IsUUID } from 'class-validator';

export class ResetPassword {
    @IsUUID()
    resetToken!: string;

    @IsString()
    newPassword!: string
}