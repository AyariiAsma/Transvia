import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  polyline: string;
}

export interface PlaceAutocomplete {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface PlaceDetails {
  placeId: string;
  formatted: string;
  lat: number;
  lng: number;
  city?: string;
  country?: string;
}

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {}

  /**
   * Calcul d'itinéraire via OSRM (gratuit, open-source)
   */
  async getRoute(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
  ): Promise<RouteResult> {
    const osrmUrl = this.config.get('OSRM_BASE_URL', 'http://router.project-osrm.org');

    try {
      const url = `${osrmUrl}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}`;
      const { data } = await firstValueFrom(
        this.http.get(url, {
          params: {
            overview: 'full',
            geometries: 'polyline',
            steps: false,
          },
          timeout: 8000,
        }),
      );

      if (!data?.routes?.length) {
        throw new Error('Aucun itinéraire trouvé');
      }

      const route = data.routes[0];
      return {
        distanceKm: Math.round((route.distance / 1000) * 10) / 10,
        durationMinutes: Math.round(route.duration / 60),
        polyline: route.geometry,
      };
    } catch (err) {
      this.logger.error(`OSRM error: ${err.message}`);

      // Fallback: calcul Haversine approximatif
      const distKm = this.haversineDistance(fromLat, fromLng, toLat, toLng);
      const durationMins = Math.round((distKm / 30) * 60); // 30 km/h moyen urbain
      return {
        distanceKm: Math.round(distKm * 10) / 10,
        durationMinutes: durationMins,
        polyline: '',
      };
    }
  }

  /**
   * Autocomplete adresses via Google Places API
   */
  async autocomplete(
    input: string,
    lat?: number,
    lng?: number,
    countryCode?: string,
  ): Promise<PlaceAutocomplete[]> {
    const apiKey = this.config.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      this.logger.warn('GOOGLE_MAPS_API_KEY non configurée');
      return [];
    }

    const params: Record<string, string> = {
      input,
      key: apiKey,
      language: 'fr',
    };

    if (lat && lng) {
      params.location = `${lat},${lng}`;
      params.radius = '50000';
    }

    if (countryCode) {
      const componentMap: Record<string, string> = {
        '+216': 'tn',
        '+213': 'dz',
        '+212': 'ma',
      };
      const country = componentMap[countryCode];
      if (country) params.components = `country:${country}`;
    }

    try {
      const { data } = await firstValueFrom(
        this.http.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
          params,
          timeout: 5000,
        }),
      );

      return (data.predictions || []).map((p: any) => ({
        placeId: p.place_id,
        description: p.description,
        mainText: p.structured_formatting?.main_text || p.description,
        secondaryText: p.structured_formatting?.secondary_text || '',
      }));
    } catch (err) {
      this.logger.error(`Google Places error: ${err.message}`);
      return [];
    }
  }

  /**
   * Détails d'un lieu via Google Places
   */
  async getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    const apiKey = this.config.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) return null;

    try {
      const { data } = await firstValueFrom(
        this.http.get('https://maps.googleapis.com/maps/api/place/details/json', {
          params: {
            place_id: placeId,
            fields: 'formatted_address,geometry,address_components',
            key: apiKey,
          },
          timeout: 5000,
        }),
      );

      const result = data.result;
      if (!result) return null;

      const city = result.address_components?.find((c: any) =>
        c.types.includes('locality'),
      )?.long_name;

      const country = result.address_components?.find((c: any) =>
        c.types.includes('country'),
      )?.long_name;

      return {
        placeId,
        formatted: result.formatted_address,
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        city,
        country,
      };
    } catch (err) {
      this.logger.error(`Place details error: ${err.message}`);
      return null;
    }
  }

  /**
   * Distance Haversine (km) — utilisée comme fallback
   */
  haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
