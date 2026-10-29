import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OtpVerifyDto {
  @ApiProperty({ example: '+21650000001' })
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/)
  phone: string;

  @ApiProperty({ example: '123456', description: 'Code OTP 6 chiffres' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Code OTP: 6 chiffres requis' })
  code: string;

  @ApiProperty({ description: 'Firebase ID token après vérification OTP côté client' })
  @IsString()
  idToken: string;
}
