import { IsString, IsEmail, IsOptional, IsEnum, IsUrl, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() avatarUrl?: string;
  @ApiPropertyOptional({ enum: ['fr', 'ar', 'en'] })
  @IsOptional() @IsEnum(['fr', 'ar', 'en']) language?: string;
}

export class RegisterDeviceDto {
  @ApiPropertyOptional() @IsString() fcmToken: string;
  @ApiPropertyOptional({ enum: ['ios', 'android'] })
  @IsEnum(['ios', 'android']) platform: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deviceModel?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() appVersion?: string;
}
