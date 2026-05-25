# Guía de Deploy — Vamos Donde Salo! (Gratis MVP)

Esta guía te lleva paso a paso desde tener el código en tu máquina hasta tener la app funcionando online, **sin gastar un peso**.

## Requisitos Previos

- Código del proyecto en tu máquina (ya lo tienes)
- Navegador web
- Unos 30-40 minutos de tiempo

## Resumen de Servicios

| Servicio | Plataforma | Propósito | Costo |
|----------|-----------|-----------|-------|
| Frontend | Vercel | Hosting Next.js | Gratis |
| Backend | Railway | API NestJS | Gratis ($5 crédito/mes) |
| Base de datos | Supabase | PostgreSQL | Gratis (500MB) |
| Imágenes | Cloudinary | Upload fotos productos | Gratis (25GB) |

---

## Paso 1: Subir código a GitHub

Si aún no tienes cuenta:
1. Ve a [github.com](https://github.com) → **Sign up**
2. Crea tu cuenta con email y contraseña

Crear el repositorio:
1. En GitHub, click **"+"** → **"New repository"**
2. Nombre: `vamos-donde-salo`
3. Visibilidad: **Private** (recomendado)
4. **No** marques "Add a README" (ya tienes uno)
5. Click **"Create repository"**

Subir tu código:
```bash
cd /ruta/a/vamos-donde-salo
git remote add origin https://github.com/TU-USUARIO/vamos-donde-salo.git
git branch -M main
git push -u origin main
```

---

## Paso 2: Crear Base de Datos en Supabase

1. Ve a [supabase.com](https://supabase.com) → **Start your project**
2. Regístrate con GitHub (más rápido)
3. Click **"New project"**
4. Configurar:
   - **Organization**: tu nombre
   - **Project name**: `salo-pos`
   - **Database Password**: genera una contraseña fuerte y **guárdala**
   - **Region**: selecciona la más cercana (ej: `South America (São Paulo)`)
5. Click **"Create new project"** — espera ~2 minutos

### Obtener DATABASE_URL

1. En tu proyecto Supabase → **Settings** (engranaje) → **Database**
2. Sección **"Connection string"** → tab **"URI"**
3. Copia la URI. Se ve así:
   ```
   postgresql://postgres.[REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
   ```
4. Reemplaza `[PASSWORD]` con la contraseña que configuraste
5. **Guarda esta URL** — la necesitas para Railway

> **Tip**: Usa la conexión "Transaction" (puerto 6543) para la app y "Session" (puerto 5432) para migraciones si tienes problemas.

---

## Paso 3: Crear cuenta en Cloudinary

1. Ve a [cloudinary.com](https://cloudinary.com) → **Sign Up Free**
2. Completa el formulario (puedes usar Google)
3. En el **Dashboard**, verás:
   - **Cloud Name**: `tu-cloud-name`
   - **API Key**: `123456789012345`
   - **API Secret**: `abc...xyz`
4. **Copia estos 3 valores** — los necesitas para Railway

---

## Paso 4: Deploy del Backend en Railway

1. Ve a [railway.app](https://railway.app) → **Login with GitHub**
2. Click **"New Project"** → **"Deploy from GitHub Repo"**
3. Selecciona tu repo `vamos-donde-salo`
4. Railway detectará el `railway.json` automáticamente

### Configurar Variables de Entorno

En Railway, ve a tu servicio → **Variables** → **Raw Editor** y pega:

```env
DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
JWT_SECRET=genera-un-secret-fuerte-con-openssl-rand-base64-32
JWT_EXPIRES_IN=7d
API_PORT=4000
FRONTEND_URL=https://tu-app.vercel.app
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret
```

> **Generar JWT_SECRET seguro**: En tu terminal, ejecuta `openssl rand -base64 32` y pega el resultado.

5. Click **"Deploy"**
6. Espera a que el build termine (2-5 minutos)
7. En **Settings** → **Networking** → **Generate Domain**
8. Copia tu URL pública (ej: `https://vamos-donde-salo-api-production.up.railway.app`)

### Verificar que funciona

Visita `https://TU-URL-RAILWAY.railway.app/health` — deberías ver:
```json
{"status":"ok","timestamp":"2024-..."}
```

---

## Paso 5: Deploy del Frontend en Vercel

1. Ve a [vercel.com](https://vercel.com) → **Sign Up** → con GitHub
2. Click **"Add New..."** → **"Project"**
3. Importa tu repo `vamos-donde-salo`
4. Vercel detectará el `vercel.json` automáticamente
5. Si pide **Root Directory**, deja en raíz (`./`)

### Configurar Variables de Entorno

En la pantalla de deploy, agrega estas variables:

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://TU-URL-RAILWAY.railway.app` |
| `NEXT_PUBLIC_WS_URL` | `https://TU-URL-RAILWAY.railway.app` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Tu número con código país (ej: `573001234567`) |
| `NEXT_PUBLIC_WHATSAPP_MESSAGE` | `Hola! Quiero hacer un pedido` |

6. Click **"Deploy"** — espera 2-3 minutos
7. Al finalizar, Vercel te da tu URL (ej: `https://vamos-donde-salo.vercel.app`)

---

## Paso 6: Conectar Frontend ↔ Backend

Ahora que tienes ambas URLs:

1. **En Railway** → Variables → actualiza:
   ```
   FRONTEND_URL=https://vamos-donde-salo.vercel.app
   ```
   (Usa tu URL real de Vercel)

2. **En Vercel** → Settings → Environment Variables → verifica que `NEXT_PUBLIC_API_URL` apunte a tu URL de Railway

3. Railway redesplegará automáticamente al cambiar variables

---

## Paso 7: Aplicar Migraciones

Las migraciones se aplican automáticamente en cada deploy de Railway (el CMD del Dockerfile ejecuta `prisma migrate deploy`). Si necesitas forzar manualmente:

### Opción A: Desde Railway CLI
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Ejecutar comando en tu servicio
railway run --service api -- npx prisma migrate deploy
```

### Opción B: Desde tu máquina local
```bash
# Configura tu DATABASE_URL local temporalmente
export DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@..."

# Ejecuta migraciones
cd apps/api && npx prisma migrate deploy
```

---

## Paso 8: Cargar Datos Iniciales (Seed) — Opcional

Si quieres cargar los datos demo (productos, usuarios, mesas):

```bash
# Con Railway CLI
railway run --service api -- node -e "require('./dist/seed.js')"

# O desde local con DATABASE_URL configurado
cd apps/api && npx ts-node src/seed.ts
```

> **Recomendación**: Para producción real, es mejor crear los datos manualmente desde el panel admin de la app.

---

## Paso 9: Verificación Final

### Checklist

- [ ] `https://TU-URL-RAILWAY/health` retorna `{"status":"ok"}`
- [ ] `https://TU-URL-VERCEL` carga la página de login
- [ ] Puedes hacer login con `admin@salo.co` / `admin123` (si corriste seed)
- [ ] El POS carga productos
- [ ] La cocina recibe pedidos en tiempo real
- [ ] El menú público funciona (`/mesa/TOKEN`)

### Problemas comunes

| Problema | Solución |
|----------|----------|
| "Cannot connect to database" | Verifica DATABASE_URL en Railway. Asegúrate de haber reemplazado [PASSWORD] |
| CORS error en frontend | Verifica FRONTEND_URL en Railway (debe coincidir exactamente con tu URL de Vercel) |
| Build falla en Vercel | Revisa que NEXT_PUBLIC_API_URL esté configurado |
| WebSocket no conecta | NEXT_PUBLIC_WS_URL debe apuntar a Railway (misma URL que API) |
| "Module not found" en Railway | Revisa que el build de Railway use el Dockerfile.prod correcto |

---

## Dominio Personalizado (Opcional)

### En Vercel (frontend):
1. Settings → Domains → Add
2. Escribe tu dominio (ej: `app.turestaurante.com`)
3. Configura los DNS según las instrucciones de Vercel (CNAME)

### En Railway (backend):
1. Settings → Networking → Custom Domain
2. Escribe tu dominio para API (ej: `api.turestaurante.com`)
3. Configura DNS

Después actualiza:
- `FRONTEND_URL` en Railway al nuevo dominio frontend
- `NEXT_PUBLIC_API_URL` en Vercel al nuevo dominio API

---

## Costos Estimados (Tier Gratuito)

| Servicio | Límite Gratis | Cuándo pagarías |
|----------|--------------|-----------------|
| Vercel | 100GB bandwidth/mes, builds ilimitados | Si tienes miles de visitas diarias |
| Railway | $5 crédito/mes, ~500 horas | Si la app está activa 24/7 se agota en ~21 días |
| Supabase | 500MB DB, 2GB transfer | Si superas 500MB de datos |
| Cloudinary | 25GB storage, 25GB bandwidth | Si subes miles de fotos |

> **Tip para Railway**: Si se te acaba el crédito antes de fin de mes, puedes pausar el servicio en horas que no trabajes, o considerar el plan Hobby ($5/mes fijo).

---

## Siguiente paso

- Lee `docs/SCALING.md` para saber cuándo y cómo escalar
- Lee `docs/PRODUCTION.md` para el checklist de seguridad
- Lee `docs/MOBILE.md` para instalar la app en celulares
