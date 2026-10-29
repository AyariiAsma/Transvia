import { IsString, IsEmail, IsOptional, IsEnum, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: '+21650000001', description: 'Téléphone format E.164' })
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, { message: 'Téléphone invalide (format: +21650000001)' })
  phone: string;

  @ApiPropertyOptional({ example: 'client@demo.com' })
  @IsEmail({}, { message: 'Email invalide' })
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'Password@123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, { message: 'Au moins une majuscule' })
  @Matches(/[0-9]/, { message: 'Au moins un chiffre' })
  password: string;

  @ApiProperty({ example: 'Ahmed' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Ben Salah' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ enum: ['CLIENT', 'CHAUFFEUR'] })
  @IsEnum(['CLIENT', 'CHAUFFEUR'])
  role: 'CLIENT' | 'CHAUFFEUR';

  @ApiProperty({ example: '+216' })
  @IsString()
  @Matches(/^\+\d{1,4}$/)
  countryCode: string;

  @ApiPropertyOptional({ enum: ['fr', 'ar', 'en'], default: 'fr' })
  @IsEnum(['fr', 'ar', 'en'])
  @IsOptional()
  language?: 'fr' | 'ar' | 'en' = 'fr';
}
