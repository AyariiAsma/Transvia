import {
  Controller, Get, Post, Patch, Body, Param, UseGuards, HttpCode, HttpStatus, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DriverService } from './driver.service';
import { DriverRegisterDto } from './dto/driver-register.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UserRole } from '@logistic/shared';
import { User } from '@prisma/client';

@ApiTags('driver')
@Controller('driver')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT')
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Post('register')
  @Roles(UserRole.CHAUFFEUR)
  @ApiOperation({ summary: 'Inscription chauffeur — informations de base et véhicule' })
  async register(@Body() dto: DriverRegisterDto, @CurrentUser() user: User) {
    return this.driverService.registerDriver(dto, user);
  }

  @Post('documents')
  @Roles(UserRole.CHAUFFEUR)
  @ApiOperation({ summary: 'Upload d\'un document (URL Cloudinary pré-uploadée)' })
  async uploadDocument(@Body() dto: UploadDocumentDto, @CurrentUser() user: User) {
    return this.driverService.uploadDocument(dto, user);
  }

  @Get('documents')
  @Roles(UserRole.CHAUFFEUR)
  @ApiOperation({ summary: 'Statut des documents soumis' })
  async getDocuments(@CurrentUser() user: User) {
    return this.driverService.getDocuments(user);
  }

  @Patch('status')
  @Roles(UserRole.CHAUFFEUR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle En ligne / Hors ligne' })
  async updateStatus(@Body() dto: UpdateStatusDto, @CurrentUser() user: User) {
    return this.driverService.updateOnlineStatus(dto.isOnline, dto.lat, dto.lng, user);
  }

  @Get('rides/active')
  @Roles(UserRole.CHAUFFEUR)
  @ApiOperation({ summary: 'Course active en cours' })
  async getActiveRide(@CurrentUser() user: User) {
    return this.driverService.getActiveRide(user);
  }

  @Post('rides/:id/accept')
  @Roles(UserRole.CHAUFFEUR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accepter une demande de course' })
  async acceptRide(@Param('id') rideId: string, @CurrentUser() user: User) {
    return this.driverService.acceptRide(rideId, user);
  }

  @Post('rides/:id/reject')
  @Roles(UserRole.CHAUFFEUR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refuser une demande de course' })
  async rejectRide(@Param('id') rideId: string, @CurrentUser() user: User) {
    return this.driverService.rejectRide(rideId, user);
  }

  @Post('rides/:id/arrived')
  @Roles(UserRole.CHAUFFEUR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Signaler l\'arrivée au point de pickup' })
  async markArrived(@Param('id') rideId: string, @CurrentUser() user: User) {
    return this.driverService.updateRideStatus(rideId, 'DRIVER_ARRIVED', user);
  }

  @Post('rides/:id/start')
  @Roles(UserRole.CHAUFFEUR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Démarrer la course (client monté)' })
  async startRide(@Param('id') rideId: string, @CurrentUser() user: User) {
    return this.driverService.updateRideStatus(rideId, 'RIDE_STARTED', user);
  }

  @Post('rides/:id/complete')
  @Roles(UserRole.CHAUFFEUR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Terminer la course' })
  async completeRide(@Param('id') rideId: string, @CurrentUser() user: User) {
    return this.driverService.completeRide(rideId, user);
  }

  @Get('earnings')
  @Roles(UserRole.CHAUFFEUR)
  @ApiOperation({ summary: 'Gains (jour/semaine/mois)' })
  async getEarnings(@CurrentUser() user: User) {
    return this.driverService.getEarnings(user);
  }

  @Get('stats')
  @Roles(UserRole.CHAUFFEUR)
  @ApiOperation({ summary: 'Statistiques performances' })
  async getStats(@CurrentUser() user: User) {
    return this.driverService.getStats(user);
  }

  @Get('history')
  @Roles(UserRole.CHAUFFEUR)
  @ApiOperation({ summary: 'Historique des courses' })
  async getHistory(
    @CurrentUser() user: User,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.driverService.getHistory(user, +page, +limit);
  }

  @Post('payouts/request')
  @Roles(UserRole.CHAUFFEUR)
  @ApiOperation({ summary: 'Demande de retrait des gains' })
  async requestPayout(@Body() body: { amount: number }, @CurrentUser() user: User) {
    return this.driverService.requestPayout(body.amount, user);
  }

  @Get('payouts')
  @Roles(UserRole.CHAUFFEUR)
  @ApiOperation({ summary: 'Historique des retraits' })
  async getPayouts(@CurrentUser() user: User) {
    return this.driverService.getPayouts(user);
  }
}
