/* eslint-disable @typescript-eslint/no-require-imports */
import { Injectable, BadRequestException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';

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
    } else {
      // ensure local uploads folder exists
      const uploads = join(process.cwd(), 'uploads', 'products');
      fs.mkdir(uploads, { recursive: true }).catch(() => {});
    }
  }

  async uploadImage(file: { mimetype: string; size: number; buffer: Buffer }, req?: any): Promise<{ url: string; publicId: string }> {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(`Tipo de archivo no permitido: ${file.mimetype}. Usa: ${allowedMimes.join(', ')}`);
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('El archivo excede el tamaño máximo de 5MB.');
    }

    if (!this.configured) {
      // Save locally under uploads/products
      const ext = file.mimetype.split('/')[1] || 'png';
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
      const relPath = join('products', filename);
      const fullPath = join(process.cwd(), 'uploads', relPath);
      await fs.writeFile(fullPath, file.buffer);
      
      let apiBase = process.env.API_URL;
      if (!apiBase && req) {
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        apiBase = `${protocol}://${req.headers.host}`;
      }
      if (!apiBase) {
        apiBase = `http://localhost:${process.env.API_PORT || 4000}`;
      }

      const url = `${apiBase}/uploads/${relPath.replace(/\\/g, '/')}`;
      return { url, publicId: filename };
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
