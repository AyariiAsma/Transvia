import { IsNumber, IsString, IsOptional, IsUUID, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FareEstimateDto {
  @ApiProperty() @IsNumber() @Min(-90) @Max(90) pickupLat: number;
  @ApiProperty() @IsNumber() @Min(-180) @Max(180) pickupLng: number;
  @ApiProperty() @IsNumber() @Min(-90) @Max(90) dropoffLat: number;
  @ApiProperty() @IsNumber() @Min(-180) @Max(180) dropoffLng: number;
  @ApiProperty() @IsUUID() vehicleTypeId: string;
  @ApiProperty({ example: '+216' }) @IsString() countryCode: string;
  @ApiProperty({ example: 'TND' }) @IsString() currencyCode: string;
  @ApiPropertyOptional() @IsOptional() @IsString() promoCode?: string;
}

export class CancelRideDto {
  @ApiProperty({ example: 'Chauffeur trop long' }) @IsString() reason: string;
}

export class RateRideDto {
  @ApiProperty({ minimum: 1, maximum: 5 }) @IsNumber() @Min(1) @Max(5) score: number;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
}
