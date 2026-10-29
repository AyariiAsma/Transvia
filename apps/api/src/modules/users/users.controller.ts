import {
  Controller, Get, Patch, Body, Param, UseGuards, Post, Query, Delete,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UserRole } from '@logistic/shared';
import { User } from '@prisma/client';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Profil complet de l\'utilisateur courant' })
  getMe(@CurrentUser() user: User) {
    return this.usersService.getFullProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Mettre à jour le profil' })
  updateMe(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Post('me/device')
  @ApiOperation({ summary: 'Enregistrer un appareil (token FCM)' })
  registerDevice(@CurrentUser() user: User, @Body() dto: RegisterDeviceDto) {
    return this.usersService.registerDevice(user.id, dto);
  }

  @Get('me/wallet')
  @ApiOperation({ summary: 'Solde du wallet' })
  getWallet(@CurrentUser() user: User) {
    return this.usersService.getWallet(user.id);
  }

  @Get('me/wallet/transactions')
  @ApiOperation({ summary: 'Historique des transactions wallet' })
  getTransactions(
    @CurrentUser() user: User,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.usersService.getTransactions(user.id, +page, +limit);
  }

  @Get('me/notifications')
  @ApiOperation({ summary: 'Notifications in-app' })
  getNotifications(@CurrentUser() user: User, @Query('unread') unread?: boolean) {
    return this.usersService.getNotifications(user.id, unread === true);
  }

  @Patch('me/notifications/:id/read')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  markRead(@CurrentUser() user: User, @Param('id') id: string) {
    return this.usersService.markNotificationRead(user.id, id);
  }

  @Patch('me/notifications/read-all')
  @ApiOperation({ summary: 'Marquer toutes les notifications comme lues' })
  markAllRead(@CurrentUser() user: User) {
    return this.usersService.markAllNotificationsRead(user.id);
  }
}
