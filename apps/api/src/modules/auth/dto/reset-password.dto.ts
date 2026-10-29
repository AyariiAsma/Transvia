import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token reçu par email' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'NewPassword@123' })
  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, { message: 'Au moins une majuscule' })
  @Matches(/[0-9]/, { message: 'Au moins un chiffre' })
  password: string;
}
