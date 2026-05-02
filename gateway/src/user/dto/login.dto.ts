import { IsEmail, IsString, IsOptional } from 'class-validator';

export class UserLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  fcmToken?: string
}