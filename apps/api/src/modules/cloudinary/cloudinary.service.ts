import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: config.get('CLOUDINARY_API_KEY'),
      api_secret: config.get('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Générer une signature pour upload direct depuis le mobile (sans passer les fichiers par le backend)
   */
  generateUploadSignature(folder: string, transformation?: string): {
    signature: string;
    timestamp: number;
    apiKey: string;
    cloudName: string;
    folder: string;
  } {
    const timestamp = Math.round(Date.now() / 1000);
    const params: Record<string, string | number> = { folder, timestamp };
    if (transformation) params.transformation = transformation;

    const signature = cloudinary.utils.api_sign_request(
      params,
      this.config.get('CLOUDINARY_API_SECRET', ''),
    );

    return {
      signature,
      timestamp,
      apiKey: this.config.get('CLOUDINARY_API_KEY', ''),
      cloudName: this.config.get('CLOUDINARY_CLOUD_NAME', ''),
      folder,
    };
  }

  /**
   * Supprimer un fichier Cloudinary
   */
  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      this.logger.error(`Cloudinary delete error: ${err.message}`);
    }
  }

  /**
   * Transformer l'URL d'une image (thumbnail, avatar, etc.)
   */
  getTransformedUrl(publicId: string, options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string | number;
  }): string {
    return cloudinary.url(publicId, {
      ...options,
      secure: true,
    });
  }
}
