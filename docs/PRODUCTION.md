# Checklist Pre-Producción — Vamos Donde Salo!

Antes de lanzar la app al público, revisa cada punto de esta lista.

---

## Seguridad

### JWT Secret
- [ ] `JWT_SECRET` es un string aleatorio de **mínimo 32 caracteres**
- [ ] Generado con: `openssl rand -base64 32`
- [ ] **NO** es el valor por defecto del `.env.example`
- [ ] Guardado como variable de entorno en Railway (no en código)

### HTTPS Forzado
- [ ] Vercel sirve frontend solo por HTTPS (automático)
- [ ] Railway sirve backend solo por HTTPS (automático con dominio generado)
- [ ] Si usas dominio custom: SSL configurado (Cloudflare o Certbot)
- [ ] No hay mixed content (HTTP assets en página HTTPS)

### Rate Limiting
La API incluye protección contra abuso:

```typescript
// Ya configurado en app.module.ts
ThrottlerModule.forRoot([{
  ttl: 60000,    // Ventana de 1 minuto
  limit: 60,     // Máximo 60 requests por IP
}])
```

Si no está configurado, agregar a `apps/api/src/app.module.ts`:
```bash
cd apps/api && pnpm add @nestjs/throttler
```

```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    // ... otros módulos
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
```

### Helmet (Headers de seguridad)
Si no está configurado, agregar en `main.ts`:
```bash
cd apps/api && pnpm add helmet
```

```typescript
import helmet from 'helmet';
// En bootstrap():
app.use(helmet());
```

### CORS Estricto
- [ ] `FRONTEND_URL` configurado en Railway con la URL exacta de Vercel
- [ ] No usar `origin: true` en producción (acepta cualquier origen)
- [ ] La API solo acepta requests del frontend configurado

Verificar en `main.ts`:
```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL?.split(',') || [],
  credentials: true,
});
```

---

## Datos y Base de Datos

### Migraciones
- [ ] Todas las migraciones están aplicadas (`prisma migrate deploy`)
- [ ] No hay migraciones pendientes
- [ ] El schema de producción coincide con el de desarrollo

### Backups
- [ ] Supabase Pro: backups automáticos activos
- [ ] O backup manual programado (ver `docs/SCALING.md`)
- [ ] Has probado restaurar un backup al menos una vez

### Seed
- [ ] Los datos demo NO están en producción (o los eliminaste)
- [ ] Las credenciales demo (`admin123`) han sido cambiadas
- [ ] El usuario admin real tiene contraseña fuerte

---

## Validación de Uploads

### Cloudinary
- [ ] Variables `CLOUDINARY_*` configuradas en Railway
- [ ] Límite de tamaño: 5MB por archivo
- [ ] Tipos MIME permitidos: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- [ ] Endpoint `/upload` protegido por JWT (solo usuarios autenticados suben fotos)

### Protecciones activas
```typescript
// En upload.service.ts - ya implementado
const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const maxSize = 5 * 1024 * 1024; // 5MB
```

---

## Logs y Monitoreo

### Logs estructurados
Para producción, usar formato JSON:

```typescript
// main.ts
import { Logger } from '@nestjs/common';

const app = await NestFactory.create(AppModule, {
  logger: process.env.NODE_ENV === 'production' 
    ? ['error', 'warn', 'log'] 
    : ['error', 'warn', 'log', 'debug', 'verbose'],
});
```

### Monitoreo recomendado
- [ ] UptimeRobot monitoreando `/health` (gratis)
- [ ] Sentry configurado para errores (gratis free tier)
- [ ] Alertas configuradas (email/Telegram cuando la app se cae)

### Métricas de los servicios
- Railway: dashboard integrado (CPU, RAM, logs)
- Vercel: Analytics básico incluido
- Supabase: dashboard con métricas de BD

---

## Variables de Entorno

### Verificar que están configuradas

**Railway (Backend):**
- [ ] `DATABASE_URL` — conexión a Supabase
- [ ] `JWT_SECRET` — secret fuerte
- [ ] `JWT_EXPIRES_IN` — ej: `7d`
- [ ] `API_PORT` — `4000`
- [ ] `FRONTEND_URL` — URL de Vercel
- [ ] `CLOUDINARY_CLOUD_NAME`
- [ ] `CLOUDINARY_API_KEY`
- [ ] `CLOUDINARY_API_SECRET`

**Vercel (Frontend):**
- [ ] `NEXT_PUBLIC_API_URL` — URL de Railway
- [ ] `NEXT_PUBLIC_WS_URL` — URL de Railway (misma)
- [ ] `NEXT_PUBLIC_WHATSAPP_NUMBER`
- [ ] `NEXT_PUBLIC_WHATSAPP_MESSAGE`

### Secrets Manager
- [ ] Variables sensibles SOLO en el panel de Railway/Vercel (nunca en código)
- [ ] `.env` está en `.gitignore`
- [ ] `.env.production.example` NO contiene valores reales

---

## Performance

### Frontend
- [ ] `output: 'standalone'` en `next.config.js` (reduce tamaño de bundle)
- [ ] Imágenes optimizadas vía Next.js Image + Cloudinary
- [ ] Service Worker activo (cachea assets)
- [ ] Lighthouse score > 80 en mobile

### Backend
- [ ] Build de producción (`pnpm build` genera JavaScript optimizado)
- [ ] No hay `console.log` en código de producción (usar Logger de NestJS)
- [ ] Connection pooling activo (Supabase lo incluye por defecto)

### Base de datos
- [ ] Índices en columnas frecuentes (`createdAt`, `status`)
- [ ] Queries pesados (dashboard) no bloquean operaciones normales
- [ ] Paginación implementada en listados largos

---

## Antes del Lanzamiento

### Funcionalidad
- [ ] Login funciona con credenciales reales
- [ ] POS puede crear pedidos y cobrar
- [ ] Cocina recibe pedidos en tiempo real
- [ ] Menú público carga sin login
- [ ] WhatsApp button funciona con número real
- [ ] Upload de fotos funciona

### Dispositivos
- [ ] Funciona en Chrome Desktop
- [ ] Funciona en Chrome Android
- [ ] Funciona en Safari iOS
- [ ] PWA se instala correctamente
- [ ] Responsive: se ve bien en móvil, tablet y desktop

### Usuarios
- [ ] Creaste tu usuario admin con contraseña fuerte
- [ ] Creaste usuarios para empleados (vendedor, cocina)
- [ ] Cada empleado sabe cómo acceder a la app

---

## Post-Lanzamiento

### Primera semana
- Revisar logs diariamente en Railway
- Verificar que UptimeRobot no reporta caídas
- Recoger feedback de empleados y clientes
- Ajustar productos/precios según necesidad

### Primer mes
- Revisar reportes de contabilidad
- Evaluar si necesitas escalar (ver `docs/SCALING.md`)
- Considerar dominio personalizado
- Backup manual si estás en free tier

### Cada 6 meses
- Rotar JWT_SECRET
- Actualizar dependencias (`pnpm update`)
- Revisar y limpiar datos antiguos si la BD crece mucho
- Evaluar nuevas funcionalidades necesarias
