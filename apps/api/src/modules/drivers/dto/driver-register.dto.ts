import { IsString, IsNumber, IsUUID, IsDateString, IsBoolean, IsOptional, IsEnum, IsUrl, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DriverRegisterDto {
  @ApiProperty({ example: 'TN-123456' }) @IsString() licenseNumber: string;
  @ApiProperty({ example: '2026-12-31' }) @IsDateString() licenseExpiry: string;
  @ApiProperty({ example: 'Volkswagen' }) @IsString() vehicleMake: string;
  @ApiProperty({ example: 'Polo' }) @IsString() vehicleModel: string;
  @ApiProperty({ example: 2020 }) @IsNumber() @Min(2000) vehicleYear: number;
  @ApiProperty({ example: '123 TN 4567' }) @IsString() vehiclePlate: string;
  @ApiProperty({ example: 'Blanc' }) @IsString() vehicleColor: string;
  @ApiProperty() @IsUUID() vehicleTypeId: string;
}

export class UploadDocumentDto {
  @ApiProperty({ enum: ['LICENSE', 'REGISTRATION', 'INSURANCE', 'NATIONAL_ID', 'PHOTO'] })
  @IsEnum(['LICENSE', 'REGISTRATION', 'INSURANCE', 'NATIONAL_ID', 'PHOTO'])
  type: string;

  @ApiProperty() @IsUrl() cloudinaryUrl: string;
  @ApiProperty() @IsString() cloudinaryPublicId: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiresAt?: string;
}

export class UpdateStatusDto {
  @ApiProperty() @IsBoolean() isOnline: boolean;
  @ApiPropertyOptional({ example: 36.8065 }) @IsOptional() @IsNumber() lat?: number;
  @ApiPropertyOptional({ example: 10.1815 }) @IsOptional() @IsNumber() lng?: number;
}
