# Vamos Donde Salo! - Sistema POS

![Production Ready](https://img.shields.io/badge/status-Production%20Ready-brightgreen)
![NestJS](https://img.shields.io/badge/backend-NestJS%2010-red)
![Next.js](https://img.shields.io/badge/frontend-Next.js%2014-black)
![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL%2016-blue)
![Docker](https://img.shields.io/badge/infra-Docker-2496ED)
![PWA](https://img.shields.io/badge/mobile-PWA%20%2B%20Capacitor-orange)

Sistema de Punto de Venta (POS) completo para restaurante de fritos/comida rápida. Incluye POS, cocina en tiempo real, domicilios, fiados, contabilidad, menú público con QR, y más.

## Demo

| | URL |
|---|---|
| Frontend | `https://tu-app.vercel.app` |
| API | `https://tu-api.railway.app` |
| Menú Público | `https://tu-app.vercel.app/mesa/TOKEN` |

> Reemplaza con tus URLs después del deploy. Ver [docs/DEPLOY.md](docs/DEPLOY.md).

---

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [docs/DEPLOY.md](docs/DEPLOY.md) | Guía paso a paso para deploy gratis (Vercel + Railway + Supabase) |
| [docs/MOBILE.md](docs/MOBILE.md) | Instalación como PWA y build nativo con Capacitor (Android/iOS) |
| [docs/SCALING.md](docs/SCALING.md) | Estrategia de escalabilidad: gratis → bajo costo → producción |
| [docs/PRODUCTION.md](docs/PRODUCTION.md) | Checklist de seguridad y pre-producción |

---

## Stack Tecnológico

- **Frontend:** Next.js 14 (App Router) + React 18 + TypeScript + TailwindCSS + Recharts
- **Backend:** NestJS 10 + Prisma ORM + PostgreSQL 16 + Cloudinary
- **Tiempo Real:** Socket.IO
- **Auth:** JWT + Roles (ADMIN, VENDEDOR, COCINA)
- **Mobile:** PWA + Capacitor (Android/iOS)
- **Infraestructura:** Docker Compose (dev) / Vercel + Railway + Supabase (prod)
- **CI/CD:** GitHub Actions (lint + build en cada PR)

---

## Inicio Rápido

### Requisitos
- Docker Desktop >= 4.0
- (Opcional) pnpm >= 9.0

### Levantar en local

```bash
# 1. Clonar
git clone <url-del-repo>
cd vamos-donde-salo

# 2. Configurar variables
cp .env.example .env

# 3. Levantar todo
docker compose up --build

# 4. Cargar datos demo (esperar ~30s a que levante)
docker compose exec api sh -c "cd apps/api && pnpm run seed"
```

### Acceder

| Servicio | URL |
|----------|-----|
| App Web | http://localhost:3000 |
| API | http://localhost:4000 |
| Health Check | http://localhost:4000/health |

### Credenciales Demo

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Admin | admin@salo.co | admin123 |
| Vendedor | vendedor@salo.co | vendedor123 |
| Cocina | cocina@salo.co | cocina123 |

---

## Funcionalidades

### Operación (Fase 1)
- POS con grid de productos, carrito, cobro, y fiar
- Cocina en tiempo real (Kanban + sonido notificación)
- Dashboard con métricas, gráficas, top productos
- Menú público QR para clientes
- CRUD: productos, mesas, usuarios, métodos de pago

### Gestión Avanzada (Fase 2)
- Domicilios con zonas, tarifas y tracking
- Fiados: cédula, historial, abonos, alertas morosos
- Proveedores con cálculo automático de pagos
- Mermas (damaged, gifted, lost)
- Gastos diarios y mensuales
- Contabilidad: reportes diarios/mensuales + cierre de caja
- WhatsApp configurable desde panel admin

### Producción (Fase 3)
- Deploy a Vercel + Railway + Supabase (guía completa)
- Upload de imágenes con Cloudinary
- PWA instalable + Capacitor (Android/iOS)
- CI/CD con GitHub Actions
- Health check endpoint
- CORS configurable por env
- Error boundary, loading skeletons, 404 personalizada
- Documentación completa de deploy, mobile, scaling, seguridad

---

## Estructura del Proyecto

```
vamos-donde-salo/
├── apps/
│   ├── api/                    # Backend NestJS
│   │   ├── prisma/             # Schema + migraciones
│   │   ├── Dockerfile          # Dev
│   │   ├── Dockerfile.prod     # Producción (multi-stage)
│   │   └── src/
│   │       ├── auth/           # JWT + guards
│   │       ├── upload/         # Cloudinary upload
│   │       ├── health/         # Healthcheck
│   │       ├── orders/         # Pedidos + delivery
│   │       ├── accounting/     # Contabilidad + cierre
│   │       └── ...             # Más módulos
│   └── web/                    # Frontend Next.js
│       ├── capacitor.config.ts # Config Capacitor (mobile)
│       └── src/
│           ├── app/            # Pages (App Router)
│           ├── components/     # ErrorBoundary, Skeleton, EmptyState...
│           └── lib/            # API client, socket, utils
├── packages/shared/            # Tipos compartidos
├── docs/                       # Documentación completa
├── .github/workflows/ci.yml    # GitHub Actions CI
├── vercel.json                 # Config Vercel
├── railway.json                # Config Railway
├── docker-compose.yml          # Dev environment
├── .env.example                # Variables dev
└── .env.production.example     # Variables producción
```

---

## Comandos

| Comando | Descripción |
|---------|-------------|
| `docker compose up --build` | Levantar todo (dev) |
| `make seed` | Cargar datos demo |
| `make migrate` | Ejecutar migraciones |
| `make stop` | Detener servicios |
| `make clean` | Reset completo |

---

## Deploy a Producción

Sigue la guía completa en **[docs/DEPLOY.md](docs/DEPLOY.md)**. Resumen:

1. Push a GitHub
2. Crear BD en Supabase (gratis)
3. Crear cuenta Cloudinary (gratis)
4. Deploy API en Railway (gratis $5/mes)
5. Deploy Web en Vercel (gratis)
6. Conectar variables
7. Listo!

Tiempo estimado: ~30-40 minutos.

---

## Mobile

La app funciona como PWA instalable en cualquier celular. También soporta build nativo con Capacitor.

Ver **[docs/MOBILE.md](docs/MOBILE.md)** para instrucciones completas.

---

## Licencia

Proyecto privado. Todos los derechos reservados.
