# Estrategia de Escalabilidad — Vamos Donde Salo!

Guía para crecer la infraestructura conforme crece tu negocio.

---

## Fase 1: MVP Gratis (Inicio)

**Costo: $0/mes**

| Servicio | Plan | Límites |
|----------|------|---------|
| Vercel | Free | 100GB bandwidth, 100 deploys/día |
| Railway | Free | $5 crédito/mes (~500 hrs compute) |
| Supabase | Free | 500MB DB, 2GB transfer, 50MB file storage |
| Cloudinary | Free | 25GB storage, 25GB bandwidth/mes |

### Capacidad estimada
- ~50-100 pedidos diarios sin problemas
- ~500 productos con fotos
- ~3-5 usuarios simultáneos en el panel admin
- Respuesta API < 200ms para operaciones normales

### Cuándo te quedas corto
- Railway se agota en ~21 días si la app está activa 24/7
- Supabase free se llena con ~10,000+ pedidos históricos
- Cloudinary free se llena con ~2,000+ fotos de productos
- Si necesitas más de 1 sucursal

### Señales de que debes escalar
- ⚠️ Railway muestra "credit exhausted" antes de fin de mes
- ⚠️ Consultas a la DB tardan > 500ms
- ⚠️ El dashboard de Supabase muestra >80% storage usado
- ⚠️ Tienes más de 5 empleados activos simultáneamente

---

## Fase 2: Bajo Costo (~$20-40/mes)

**Para cuando el negocio ya genera ingresos constantes.**

| Servicio | Plan | Costo | Mejora |
|----------|------|-------|--------|
| Vercel | Free (sigue siendo suficiente) | $0 | — |
| Railway | Hobby | $5/mes | Sin límite de horas, 8GB RAM |
| Supabase | Pro | $25/mes | 8GB DB, 250GB transfer, backups diarios |
| Cloudinary | Free (o Plus $89/año) | $0-7/mes | Más storage si necesitas |
| Dominio | .com o .co | ~$12/año | URL profesional |

### Capacidad estimada
- ~500-1000 pedidos diarios
- ~5,000 productos
- ~10-15 usuarios simultáneos
- Backups automáticos diarios (Supabase Pro)
- SSL/HTTPS incluido en todos los servicios

### Cuándo migrar a Fase 2
- Cuando el negocio facture > $500.000 COP/mes
- Cuando tengas más de 1 sucursal planeada
- Cuando el free tier de Railway no alcance

### Configuración adicional recomendada
- Activar **Supabase Point-in-Time Recovery** (viene con Pro)
- Configurar **alertas de uso** en Railway y Supabase
- Comprar dominio y configurar DNS

---

## Fase 3: Producción Profesional (~$50-200/mes)

**Para múltiples sucursales o alto volumen.**

### Arquitectura recomendada

```
Internet → Cloudflare CDN/WAF → Load Balancer
                                     ↓
                            ┌────────────────┐
                            │  VPS (API x2)  │ ← Docker + Nginx
                            └────────┬───────┘
                                     ↓
                            ┌────────────────┐
                            │  PostgreSQL     │ ← Managed (Supabase/DO)
                            │  Managed        │
                            └────────────────┘
```

### Stack recomendado

| Componente | Opción | Costo aprox |
|-----------|--------|-------------|
| VPS | Hetzner CX31 / DigitalOcean Droplet | $15-30/mes |
| DB | Supabase Pro o DO Managed DB | $25-50/mes |
| CDN/WAF | Cloudflare (free o Pro) | $0-20/mes |
| Monitoreo | Sentry + UptimeRobot | $0-26/mes |
| Storage | Cloudinary Plus o S3 | $7-20/mes |
| Dominio | .com + SSL | $12/año |
| **Total** | | **$50-150/mes** |

### Configuración VPS (Docker)

```bash
# En tu VPS (Ubuntu 22.04)
apt update && apt upgrade -y
apt install docker.io docker-compose-plugin nginx certbot -y

# Clonar repo
git clone git@github.com:tu-usuario/vamos-donde-salo.git
cd vamos-donde-salo

# Build producción
docker build -f apps/api/Dockerfile.prod -t salo-api .

# Ejecutar
docker run -d \
  --name salo-api \
  --restart unless-stopped \
  -p 4000:4000 \
  --env-file .env.production \
  salo-api
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.turestaurante.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.turestaurante.com;

    ssl_certificate /etc/letsencrypt/live/api.turestaurante.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.turestaurante.com/privkey.pem;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Seguridad (Todas las fases)

### HTTPS
- ✅ Vercel y Railway proveen HTTPS automático
- Para VPS: usar Certbot (Let's Encrypt gratuito)
```bash
certbot --nginx -d api.turestaurante.com
```

### Rate Limiting
Ya configurado en la API con `@nestjs/throttler`:
- 60 requests/minuto por IP para endpoints normales
- 5 intentos/minuto para login

### Headers de Seguridad
Helmet está incluido en la API para headers como:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security`

### Secrets Rotation
- Cambiar `JWT_SECRET` cada 6 meses
- Rotar API keys de Cloudinary anualmente
- Nunca commitear `.env` al repositorio

---

## Backups

### Fase 1-2 (Supabase)
Supabase Pro incluye backups automáticos diarios. Para Free:

```bash
# Backup manual (ejecutar desde tu máquina)
pg_dump "postgresql://postgres.[REF]:[PASSWORD]@..." > backup_$(date +%Y%m%d).sql

# Restaurar
psql "postgresql://..." < backup_20240101.sql
```

### Fase 3 (VPS)
Cron job diario + subir a S3/Backblaze:

```bash
# /etc/cron.d/salo-backup
0 3 * * * root pg_dump $DATABASE_URL | gzip > /backups/salo_$(date +\%Y\%m\%d).sql.gz && aws s3 cp /backups/salo_$(date +\%Y\%m\%d).sql.gz s3://salo-backups/
```

### Política de retención
- Diarios: últimos 7 días
- Semanales: últimas 4 semanas
- Mensuales: últimos 12 meses

---

## Monitoreo

### UptimeRobot (Gratis)
1. Crea cuenta en [uptimerobot.com](https://uptimerobot.com)
2. Agrega monitor HTTP(s): `https://tu-api.railway.app/health`
3. Configura alertas por email/Telegram
4. Te notifica si la API se cae

### Sentry (Error Tracking - Free tier)
1. Crea cuenta en [sentry.io](https://sentry.io)
2. Crea proyecto NestJS
3. Agrega el SDK al backend:
```bash
cd apps/api && pnpm add @sentry/node
```
4. Inicializa en `main.ts`:
```ts
import * as Sentry from '@sentry/node';
Sentry.init({ dsn: process.env.SENTRY_DSN });
```
5. Recibirás alertas de errores no manejados

### Métricas Railway/Vercel
- Railway dashboard muestra CPU, RAM, network en tiempo real
- Vercel Analytics (Pro) muestra Web Vitals y uso

---

## Decisión: Cuándo pasar de una fase a otra

| Pregunta | Sí → | No → |
|----------|------|------|
| ¿Railway free se agota regularmente? | Fase 2 | Quédate en Fase 1 |
| ¿Tienes > 500 pedidos/día? | Fase 2-3 | Fase 1-2 |
| ¿Necesitas múltiples sucursales? | Fase 3 | Fase 1-2 |
| ¿Facturas > $2M COP/mes? | Fase 3 | Fase 1-2 |
| ¿Necesitas 99.9% uptime? | Fase 3 | Fase 1-2 |
| ¿Tienes equipo técnico interno? | Fase 3 VPS | Fase 2 managed |

---

## Optimizaciones de Rendimiento

### Base de datos
- Agregar índices a columnas frecuentes: `createdAt`, `status`, `userId`
- Usar `LIMIT` y paginación en consultas grandes
- Considerar vistas materializadas para reportes pesados

### API
- Cachear respuestas del dashboard (Redis si necesitas)
- Comprimir respuestas (NestJS compression middleware)
- Connection pooling (PgBouncer, ya incluido en Supabase)

### Frontend
- Las imágenes ya se sirven desde Cloudinary CDN
- Next.js Image optimization activo
- Service Worker cachea assets estáticos

### WebSocket
- Para >50 conexiones simultáneas: considerar Redis adapter para Socket.IO
- Separar namespace por sucursal si aplica
