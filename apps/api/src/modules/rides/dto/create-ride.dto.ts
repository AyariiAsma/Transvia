import { IsNumber, IsString, IsEnum, IsOptional, IsUUID, Min, Max, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceType, PaymentMethod } from '@logistic/shared';

export class CreateRideDto {
  @ApiProperty({ example: 36.8065 }) @IsNumber() @Min(-90) @Max(90) pickupLat: number;
  @ApiProperty({ example: 10.1815 }) @IsNumber() @Min(-180) @Max(180) pickupLng: number;
  @ApiProperty({ example: 'Avenue Habib Bourguiba, Tunis' }) @IsString() pickupAddress: string;
  @ApiProperty({ example: 36.8189 }) @IsNumber() @Min(-90) @Max(90) dropoffLat: number;
  @ApiProperty({ example: 10.1658 }) @IsNumber() @Min(-180) @Max(180) dropoffLng: number;
  @ApiProperty({ example: 'Lac 1, Tunis' }) @IsString() dropoffAddress: string;
  @ApiProperty() @IsUUID() vehicleTypeId: string;
  @ApiProperty({ enum: ServiceType }) @IsEnum(ServiceType) serviceType: ServiceType;
  @ApiProperty({ enum: PaymentMethod }) @IsEnum(PaymentMethod) paymentMethod: PaymentMethod;
  @ApiProperty({ example: '+216' }) @IsString() countryCode: string;
  @ApiProperty({ example: 'TND' }) @IsString() currencyCode: string;
  @ApiPropertyOptional({ example: 'WELCOME20' }) @IsOptional() @IsString() promoCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
