import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS: aceptar localhost, IPs locales, y cualquier origen en dev
  const frontendUrl = process.env.FRONTEND_URL;
  app.enableCors({
    origin: (origin, callback) => {
      if (!frontendUrl || frontendUrl === '*' || frontendUrl === 'true') {
        callback(null, true);
      } else {
        const allowedOrigins = frontendUrl.split(',');
        if (allowedOrigins.indexOf(origin || '') !== -1 || !origin) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Serve uploaded files from /uploads when using platform-express
  const uploadsPath = join(process.cwd(), 'uploads');
  try {
    // `useStaticAssets` exists on the Express adapter
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    app.useStaticAssets(uploadsPath, { prefix: '/uploads' });
  } catch (e) {
    // ignore if not available
  }

  const port = process.env.PORT || process.env.API_PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`API running on port ${port}`);
}
bootstrap();
