import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';

export class CreateAccountDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  nationalId?: string;
}