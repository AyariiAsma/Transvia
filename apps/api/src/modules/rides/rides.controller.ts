import {
  Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RidesService } from './rides.service';
import { CreateRideDto } from './dto/create-ride.dto';
import { FareEstimateDto } from './dto/fare-estimate.dto';
import { CancelRideDto } from './dto/cancel-ride.dto';
import { RateRideDto } from './dto/rate-ride.dto';
import { UserRole } from '@logistic/shared';
import { User } from '@prisma/client';

@ApiTags('rides')
@Controller('rides')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT')
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  @Post('estimate')
  @Roles(UserRole.CLIENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Estimation du prix, distance et durée' })
  async estimate(@Body() dto: FareEstimateDto, @CurrentUser() user: User) {
    return this.ridesService.estimateFare(dto, user);
  }

  @Post()
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Créer une nouvelle course' })
  async createRide(@Body() dto: CreateRideDto, @CurrentUser() user: User) {
    return this.ridesService.createRide(dto, user);
  }

  @Get('history')
  @ApiOperation({ summary: 'Historique des courses' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getHistory(
    @CurrentUser() user: User,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.ridesService.getRideHistory(user, +page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une course' })
  async getRide(@Param('id') id: string, @CurrentUser() user: User) {
    return this.ridesService.getRide(id, user);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Annuler une course' })
  async cancelRide(
    @Param('id') id: string,
    @Body() dto: CancelRideDto,
    @CurrentUser() user: User,
  ) {
    return this.ridesService.cancelRide(id, user, dto.reason);
  }

  @Post(':id/rate')
  @Roles(UserRole.CLIENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Noter le chauffeur après la course' })
  async rateRide(
    @Param('id') id: string,
    @Body() dto: RateRideDto,
    @CurrentUser() user: User,
  ) {
    return this.ridesService.rateRide(id, user, dto.score, dto.comment);
  }

  @Get(':id/track')
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Position live du chauffeur' })
  async trackDriver(@Param('id') id: string, @CurrentUser() user: User) {
    return this.ridesService.getDriverTracking(id, user);
  }

  @Get(':id/receipt')
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Reçu de la course' })
  async getReceipt(@Param('id') id: string, @CurrentUser() user: User) {
    return this.ridesService.getRideReceipt(id, user);
  }
}
