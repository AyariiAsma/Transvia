import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OtpSendDto {
  @ApiProperty({ example: '+21650000001' })
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, { message: 'Format téléphone invalide' })
  phone: string;
}
