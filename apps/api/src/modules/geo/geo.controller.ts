import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GeoService } from './geo.service';

@ApiTags('geo')
@Controller('geo')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class GeoController {
  constructor(private readonly geo: GeoService) {}

  @Get('places/autocomplete')
  @ApiOperation({ summary: 'Recherche d\'adresses (Google Places proxy)' })
  async autocomplete(
    @Query('input') input: string,
    @Query('lat') lat?: number,
    @Query('lng') lng?: number,
    @Query('countryCode') countryCode?: string,
  ) {
    const results = await this.geo.autocomplete(input, lat ? +lat : undefined, lng ? +lng : undefined, countryCode);
    return { success: true, data: results };
  }

  @Get('places/details')
  @ApiOperation({ summary: 'Détails d\'un lieu Google Places' })
  async placeDetails(@Query('placeId') placeId: string) {
    const result = await this.geo.getPlaceDetails(placeId);
    return { success: true, data: result };
  }

  @Get('route')
  @ApiOperation({ summary: 'Calcul d\'itinéraire OSRM' })
  async getRoute(
    @Query('fromLat') fromLat: number,
    @Query('fromLng') fromLng: number,
    @Query('toLat') toLat: number,
    @Query('toLng') toLng: number,
  ) {
    const result = await this.geo.getRoute(+fromLat, +fromLng, +toLat, +toLng);
    return { success: true, data: result };
  }
}
