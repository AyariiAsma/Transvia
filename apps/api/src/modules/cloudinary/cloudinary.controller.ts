import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CloudinaryService } from './cloudinary.service';

@ApiTags('cloudinary')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class CloudinaryController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  @Get('signature')
  @ApiOperation({ summary: 'Générer une signature pour upload direct Cloudinary depuis le mobile' })
  getSignature(
    @Query('folder') folder: string = 'drivers',
    @Query('transformation') transformation?: string,
  ) {
    const sig = this.cloudinary.generateUploadSignature(folder, transformation);
    return { success: true, data: sig };
  }
}
