import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new AllExceptionsFilter());

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
    const expressApp = app.getHttpAdapter().getInstance();
    const fs = require('fs');
    const path = require('path');
    
    // Intercept requests to /uploads to serve placeholder if local file is missing (e.g. after Render restart)
    expressApp.use('/uploads', (req: any, res: any, next: any) => {
      const filePath = path.join(uploadsPath, req.path);
      fs.access(filePath, fs.constants.F_OK, (err: any) => {
        if (err) {
          return res.redirect('https://placehold.co/600x400/f3f4f6/374151?text=Vamos+Donde+Salo');
        }
        next();
      });
    });

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
