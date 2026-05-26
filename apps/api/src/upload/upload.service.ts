/* eslint-disable @typescript-eslint/no-require-imports */
import { Injectable, BadRequestException } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const cloudinary = require('cloudinary').v2;

const CLOUDINARY_PLACEHOLDER = 'https://via.placeholder.com/400x400?text=Sin+imagen';

@Injectable()
export class UploadService {
  private configured: boolean;

  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    this.configured = !!(cloudName && apiKey && apiSecret);

    if (this.configured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
    }
  }

  async uploadImage(file: { mimetype: string; size: number; buffer: Buffer }): Promise<{ url: string; publicId: string }> {
    if (!this.configured) {
      console.warn('Cloudinary no configurado, retornando placeholder');
      return { url: CLOUDINARY_PLACEHOLDER, publicId: 'placeholder' };
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(`Tipo de archivo no permitido: ${file.mimetype}. Usa: ${allowedMimes.join(', ')}`);
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('El archivo excede el tamaño máximo de 5MB.');
    }

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'salo/products',
          resource_type: 'image',
          transformation: [
            { width: 800, height: 800, crop: 'limit', quality: 'auto' },
          ],
        },
        (error: any, result: any) => {
          if (error || !result) {
            reject(new BadRequestException(error?.message || 'Error al subir imagen'));
          } else {
            resolve({ url: result.secure_url, publicId: result.public_id });
          }
        },
      ).end(file.buffer);
    });
  }
}
