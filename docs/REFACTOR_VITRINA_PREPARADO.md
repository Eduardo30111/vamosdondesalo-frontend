# Refactor Vitrina + Preparado — Donde Salo!

## Decisiones Técnicas

### 1. Modelo de negocio: dos preparationMode
Se separó el inventario en dos flujos claros usando `PreparationMode` (`VITRINA` / `PREPARADO`):
- **VITRINA**: Productos ya cocinados y listos para vender. Se descontó directamente de `VitrinaStock` al crear la orden. El pedido queda en estado `PAID` (listo para entregar), sin pasar por cocina.
- **PREPARADO**: Productos hechos al momento (hamburguesa, perro). NO se descuenta de vitrina. La orden queda en `PENDING` y llega al panel de cocina como un pedido a preparar.
- **Bebidas / supplier**: Se marcan como `VITRINA`, por lo que también se descuentan directo.

### 2. Eliminación de DailyStock y KitchenProduction
- `DailyStock` (stock diario por fecha) y `KitchenProduction` (tandas con `startedQty`/`readyQty`/`status`) fueron reemplazados por:
  - `VitrinaStock`: stock persistente por producto, decrementado en POS y aumentado desde cocina.
  - `ProductionOrder`: solicitud de producción con `requestedQty` y `readyQty`, sin estados enum, solo progreso numérico.
- Esto simplifica la lógica de negocio: cocina ve dos paneles claros (pedidos de producción vs pedidos preparados).

### 3. Seed mínimo realista
Se redujo el seed a lo estrictamente necesario para demo y testing:
- 3 usuarios (roles admin/vendedor/cocina)
- 5 VITRINA (empanada, arepa, buñuelo, dedito, papa) + Coca Cola
- 2 PREPARADO (hamburguesa, perro)
- Stock inicial en `VitrinaStock`
- 2 mesas y 2 zonas de domicilio

### 4. Compatibilidad con módulos satélite
- No se eliminaron módulos como `customers`, `expenses`, `accounting`, etc.
- Se mantuvieron en `AppModule` pero se ajustaron sus servicios a los campos reales del schema nuevo para evitar errores de TypeScript.

### 5. Frontend
- **POS**: badge de stock en cada producto VITRINA, modal "Solicitar más".
- **Cocina**: panel dividido (izq órdenes de producción, der pedidos preparados).
- **Landing/Pública**: filtrado en backend, solo productos VITRINA con `stock > 0`.
- **Dashboard**: sección "Stock Vitrina" agregada.

---

## Endpoints modificados / nuevos

### Backend

| Endpoint | Método | Cambio |
|----------|--------|--------|
| `/products` | GET | Ahora incluye `vitrinaStock` y `preparationMode` |
| `/products` | POST | Crea `VitrinaStock` automáticamente si es VITRINA |
| `/orders` | POST | Lógica VITRINA vs PREPARADO: descuenta stock, setea `PAID` o `PENDING` |
| `/orders/active` | GET | Filtra excluyendo `PAID` y `DELIVERED` |
| `/public/products` | GET | Ahora solo devuelve `VITRINA` con `stock > 0` |
| `/production-orders` | POST | **NUEVO** — crear orden de producción |
| `/production-orders/pending` | GET | **NUEVO** — listar órdenes con progreso |
| `/production-orders/:id/add-ready` | PUT | **NUEVO** — incrementar `readyQty` y stock vitrina |
| `/production-orders/:id/complete` | PUT | **NUEVO** — completar producción y volcar resto a vitrina |
| `/daily-stock/*` | — | **ELIMINADO** |
| `/kitchen-production/*` | — | **ELIMINADO** (reemplazado por `/production-orders`) |

### Eventos Socket.IO
- `vitrina:updated` — emitido al vender producto VITRINA o al subir stock desde cocina
- `production:updated` — emitido al crear/modificar una `ProductionOrder`
- `order:created` / `order:status_changed` — mantenidos para pedidos preparados

---

## Checklist de Verificación

- [x] `docker compose up --build` arranca (api, web, postgres healthy)
- [x] Login admin funciona (`admin@salo.co` / `admin123`)
- [x] Dashboard muestra productos top + vitrina stock
- [x] Admin crea producto VITRINA y PREPARADO (endpoint `/products` funciona)
- [x] POS vendedor: producto VITRINA se añade y se cobra directo. VitrinaStock baja.
- [x] POS vendedor: "Solicitar producción" crea orden en cocina (`/production-orders`)
- [x] Cocina ve ProductionOrders con progreso (X de Y)
- [x] Cocina marca +hechos y stock vitrina sube
- [x] Producto PREPARADO va a cocina como pedido PENDING
- [x] Landing/QR muestra solo VITRINA con stock > 0
- [x] Cliente domicilio pide VITRINA → se descuenta directo
- [x] Cliente domicilio pide PREPARADO → va a cocina
- [x] Pedido PREPARADO listo en cocina → vendedor lo ve para cobrar (`/orders/active` incluye READY)

---

## Notas
- Stack: Next.js (3000) + NestJS (4000) + Prisma + PostgreSQL + Socket.IO
- Todos los labels y toasts están en español.
- Tipo de dato estricto: sin `any` en el código nuevo; errores heredados fueron corregidos para build limpio.
