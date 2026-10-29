import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { UserRole } from '@logistic/shared';
import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class BroadcastNotificationDto {
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() body: string;
  @ApiProperty({ enum: ['ALL', 'CLIENTS', 'DRIVERS'] }) @IsEnum(['ALL', 'CLIENTS', 'DRIVERS']) target: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() userIds?: string[];
}

class UpdateDriverStatusDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED', 'SUSPENDED'] })
  @IsEnum(['APPROVED', 'REJECTED', 'SUSPENDED']) status: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

class VerifyDocumentDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] }) @IsEnum(['APPROVED', 'REJECTED']) status: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

class UpdateUserStatusDto {
  @ApiProperty() @IsBoolean() isActive: boolean;
}

class PricingRuleDto {
  @ApiProperty() @IsString() vehicleTypeId: string;
  @ApiProperty() @IsString() countryCode: string;
  @ApiProperty() @IsNumber() baseFare: number;
  @ApiProperty() @IsNumber() perKmRate: number;
  @ApiProperty() @IsNumber() perMinuteRate: number;
  @ApiProperty() @IsNumber() minFare: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() cancellationFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() cancellationGraceMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() platformCommissionPct?: number;
}

class PromoCodeDto {
  @ApiProperty() @IsString() code: string;
  @ApiProperty({ enum: ['PERCENTAGE', 'FIXED'] }) @IsEnum(['PERCENTAGE', 'FIXED']) type: string;
  @ApiProperty() @IsNumber() value: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() maxDiscount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() minFare?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() usageLimit?: number;
  @ApiProperty() @IsString() validFrom: string;
  @ApiPropertyOptional() @IsOptional() @IsString() validUntil?: string;
  @ApiProperty() @IsArray() countryCodes: string[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() userLimitPerCode?: number;
}

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('JWT')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Dashboard ──────────────────────────────────────────────────────────────
  @Get('dashboard')
  @ApiOperation({ summary: 'KPI Dashboard temps réel' })
  getDashboard() { return this.adminService.getDashboardStats(); }

  @Get('dashboard/map')
  @ApiOperation({ summary: 'Données carte — chauffeurs + courses actives' })
  getMapData() { return this.adminService.getMapData(); }

  // ─── Rides ──────────────────────────────────────────────────────────────────
  @Get('rides')
  @ApiOperation({ summary: 'Toutes les courses (paginé, filtrable)' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false }) @ApiQuery({ name: 'country', required: false })
  getRides(@Query() query: any) { return this.adminService.getRides(query); }

  @Get('rides/:id')
  @ApiOperation({ summary: 'Détail d\'une course (admin)' })
  getRide(@Param('id') id: string) { return this.adminService.getRide(id); }

  @Post('rides/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Annuler une course (admin)' })
  cancelRide(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.adminService.adminCancelRide(id, body.reason);
  }

  @Post('rides/:id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assigner manuellement un chauffeur' })
  assignDriver(@Param('id') id: string, @Body() body: { driverId: string }) {
    return this.adminService.assignDriver(id, body.driverId);
  }

  @Post('rides/:id/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rembourser une course' })
  refundRide(@Param('id') id: string) {
    return this.adminService.refundRide(id);
  }

  // ─── Drivers ─────────────────────────────────────────────────────────────────
  @Get('drivers')
  @ApiOperation({ summary: 'Liste des chauffeurs' })
  getDrivers(@Query() query: any) { return this.adminService.getDrivers(query); }

  @Get('drivers/:id')
  @ApiOperation({ summary: 'Profil chauffeur complet' })
  getDriver(@Param('id') id: string) { return this.adminService.getDriver(id); }

  @Patch('drivers/:id/status')
  @ApiOperation({ summary: 'Approuver / Suspendre / Rejeter un chauffeur' })
  updateDriverStatus(@Param('id') id: string, @Body() dto: UpdateDriverStatusDto) {
    return this.adminService.updateDriverStatus(id, dto.status, dto.reason);
  }

  @Get('drivers/:id/documents')
  @ApiOperation({ summary: 'Documents du chauffeur' })
  getDriverDocuments(@Param('id') id: string) {
    return this.adminService.getDriverDocuments(id);
  }

  @Patch('drivers/:id/documents/:docId')
  @ApiOperation({ summary: 'Valider / Rejeter un document' })
  verifyDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Body() dto: VerifyDocumentDto,
  ) { return this.adminService.verifyDocument(id, docId, dto.status, dto.reason); }

  // ─── Users ───────────────────────────────────────────────────────────────────
  @Get('users')
  @ApiOperation({ summary: 'Liste des utilisateurs' })
  getUsers(@Query() query: any) { return this.adminService.getUsers(query); }

  @Get('users/:id')
  @ApiOperation({ summary: 'Profil utilisateur' })
  getUser(@Param('id') id: string) { return this.adminService.getUser(id); }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Activer / Désactiver un compte' })
  updateUserStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.adminService.updateUserStatus(id, dto.isActive);
  }

  // ─── Finance ──────────────────────────────────────────────────────────────────
  @Get('finance/transactions')
  @ApiOperation({ summary: 'Toutes les transactions' })
  getTransactions(@Query() query: any) { return this.adminService.getTransactions(query); }

  @Get('finance/payouts')
  @ApiOperation({ summary: 'Demandes de retrait' })
  getPayouts(@Query() query: any) { return this.adminService.getPayouts(query); }

  @Patch('finance/payouts/:id')
  @ApiOperation({ summary: 'Traiter un retrait (approuver / rejeter)' })
  processPayout(@Param('id') id: string, @Body() body: { status: string }) {
    return this.adminService.processPayout(id, body.status);
  }

  // ─── Pricing ──────────────────────────────────────────────────────────────────
  @Get('pricing')
  @ApiOperation({ summary: 'Toutes les règles tarifaires' })
  getPricingRules() { return this.adminService.getPricingRules(); }

  @Post('pricing')
  @ApiOperation({ summary: 'Créer une règle tarifaire' })
  createPricingRule(@Body() dto: PricingRuleDto) {
    return this.adminService.createPricingRule(dto);
  }

  @Patch('pricing/:id')
  @ApiOperation({ summary: 'Modifier une règle tarifaire' })
  updatePricingRule(@Param('id') id: string, @Body() dto: Partial<PricingRuleDto>) {
    return this.adminService.updatePricingRule(id, dto);
  }

  // ─── Vehicle Types ────────────────────────────────────────────────────────────
  @Get('vehicle-types')
  @ApiOperation({ summary: 'Types de véhicules' })
  getVehicleTypes() { return this.adminService.getVehicleTypes(); }

  @Post('vehicle-types')
  @ApiOperation({ summary: 'Créer un type de véhicule' })
  createVehicleType(@Body() body: any) { return this.adminService.createVehicleType(body); }

  @Patch('vehicle-types/:id')
  @ApiOperation({ summary: 'Modifier un type de véhicule' })
  updateVehicleType(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateVehicleType(id, body);
  }

  // ─── Promo Codes ──────────────────────────────────────────────────────────────
  @Get('promo-codes')
  @ApiOperation({ summary: 'Codes promo' })
  getPromoCodes() { return this.adminService.getPromoCodes(); }

  @Post('promo-codes')
  @ApiOperation({ summary: 'Créer un code promo' })
  createPromoCode(@Body() dto: PromoCodeDto) { return this.adminService.createPromoCode(dto); }

  @Patch('promo-codes/:id/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activer / Désactiver un code promo' })
  togglePromoCode(@Param('id') id: string) { return this.adminService.togglePromoCode(id); }

  // ─── Notifications broadcast ──────────────────────────────────────────────────
  @Post('notifications/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Envoyer une notification à des groupes d\'utilisateurs' })
  sendNotification(@Body() dto: BroadcastNotificationDto) {
    return this.adminService.sendBroadcastNotification(dto);
  }

  // ─── Settings ────────────────────────────────────────────────────────────────
  @Get('settings')
  @ApiOperation({ summary: 'Paramètres système' })
  getSettings() { return this.adminService.getSettings(); }

  @Patch('settings/:key')
  @ApiOperation({ summary: 'Modifier un paramètre' })
  updateSetting(@Param('key') key: string, @Body() body: { value: unknown }) {
    return this.adminService.updateSetting(key, body.value);
  }
}
