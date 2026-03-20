# 🏆 Balling

Plataforma para organizar y competir en torneos locales de pádel, tenis y squash. Los jugadores encuentran torneos cercanos, se inscriben y pagan online, y siguen sus partidos y brackets en tiempo real.

**Objetivo:** Publicar en App Store y Google Play como app React Native, con el backend actual como API compartida.

---

## Estado actual del proyecto

| Capa | Estado |
|------|--------|
| Backend (API REST) | ✅ Funcional |
| Web app (React + Vite) | ✅ Funcional |
| App móvil (React Native) | 🔲 Por desarrollar |

La web sirve como referencia de diseño y lógica para la app móvil. Comparten el mismo backend.

---

## Stack técnico

```
├── Backend          Node.js · Express · TypeScript · Prisma · PostgreSQL
├── Pagos            Stripe Checkout + Webhooks
├── Auth             JWT en cookies HTTP-only
├── Web (actual)     React 18 · Vite · Tailwind CSS
└── Mobile (próximo) React Native · Expo (recomendado)
```

---

## Arquitectura

```
[App móvil RN]  ──┐
                  ├──▶  API REST (Express)  ──▶  PostgreSQL
[Web app React] ──┘         │
                        Stripe API
```

El backend expone una API REST en `/api/`. Tanto la web como la futura app móvil consumen los mismos endpoints.

---

## Módulos principales

### Auth
- Registro y login con email/contraseña
- JWT almacenado en cookie `httpOnly`
- Roles: `PLAYER`, `ORGANIZER`, `ADMIN`

### Torneos
- Crear, listar y filtrar torneos por deporte, estado y búsqueda
- Deportes: Pádel, Tenis, Squash
- Formatos: Single Elimination, Round Robin *(Double Elimination próximamente)*

### Inscripciones y pagos
- Flujo de pago vía Stripe Checkout
- Torneos gratuitos omiten Stripe y registran al jugador directamente
- Webhook para confirmar pagos y registrar jugadores

### Brackets
- Generación automática al cerrar inscripciones
- Single Elimination con byes automáticos
- Round Robin con tabla de resultados y standings

---

## Requisitos para desarrollo

- Node.js 18+
- PostgreSQL 14+
- Cuenta Stripe (modo test para desarrollo)

---

## Setup del backend

```bash
# 1. Instalar dependencias
npm run install:all

# 2. Configurar entorno
cp .env.example server/.env
# Editar server/.env con tus valores

# 3. Crear base de datos y ejecutar migraciones
npm run db:migrate

# 4. (Opcional) Cargar datos de prueba
npm run db:seed

# 5. Arrancar
npm run dev
```

Usuarios de prueba (contraseña: `password123`):
- `admin@tourneyplay.com` — Admin
- `maria@tourneyplay.com` — Organizer
- `carlos@example.com` — Player

---

## Variables de entorno

```env
DATABASE_URL=postgresql://user:password@localhost:5432/tourneyplay
JWT_SECRET=secreto-seguro
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CLIENT_URL=http://localhost:5173
PORT=3001
```

Para recibir webhooks de Stripe en local:
```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

---

## Endpoints de la API

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Registro |
| POST | `/api/auth/login` | — | Login |
| POST | `/api/auth/logout` | — | Logout |
| GET | `/api/auth/me` | ✅ | Usuario actual |
| GET | `/api/tournaments` | — | Listar torneos |
| GET | `/api/tournaments/:id` | — | Detalle de torneo |
| POST | `/api/tournaments` | ORGANIZER | Crear torneo |
| POST | `/api/tournaments/:id/join` | PLAYER | Unirse (inicia pago) |
| POST | `/api/tournaments/:id/close-registration` | ORGANIZER | Cerrar e iniciar torneo |
| POST | `/api/tournaments/:id/cancel` | ORGANIZER | Cancelar torneo |
| GET | `/api/tournaments/my` | ✅ | Mis inscripciones |
| PUT | `/api/matches/:id/result` | ORGANIZER | Registrar resultado |
| POST | `/api/webhooks/stripe` | — | Webhook de Stripe |

---

## Hoja de ruta — App móvil

La web actual es la referencia funcional. La app React Native deberá cubrir:

- [ ] Setup Expo + navegación (React Navigation)
- [ ] Autenticación (adaptar JWT a AsyncStorage o SecureStore)
- [ ] Listado y detalle de torneos
- [ ] Inscripción con Stripe (Stripe React Native SDK)
- [ ] Dashboard del jugador (mis torneos, brackets)
- [ ] Panel del organizador
- [ ] Notificaciones push (inicio de torneo, resultados)
- [ ] Publicación en App Store y Google Play

---

## Convenciones del proyecto

- `entryFee` siempre en céntimos (`€10,00 = 1000`)
- Fechas en ISO 8601 UTC
- Errores de la API: `{ error: string }`
- Validación con Zod tanto en cliente como en servidor

---

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Backend + web en paralelo |
| `npm run db:migrate` | Ejecutar migraciones |
| `npm run db:seed` | Datos de prueba |
| `cd server && npx prisma studio` | UI visual de la base de datos |