import { IsString, IsEmail, IsOptional, Matches, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiPropertyOptional({ example: '+21650000001' })
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/)
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'client@demo.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Password@123' })
  @IsString()
  @MinLength(1)
  password: string;
}
