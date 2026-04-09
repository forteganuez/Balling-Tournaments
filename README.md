/usage# Balling

Tournament platform for padel, tennis, and squash. Players find local tournaments, register and pay online, and follow their matches and brackets in real time.

Built as a React Native mobile app with an Express API backend, targeting App Store and Google Play.

---

## Tech Stack

```
Mobile       React Native · Expo · NativeWind · React Navigation
Backend      Node.js · Express · TypeScript · Prisma · PostgreSQL (Supabase)
Auth         JWT · Google · Apple · Microsoft OAuth
Payments     Stripe Checkout + Webhooks
Storage      Supabase Storage (image uploads)
Monitoring   Sentry (optional)
```

## Architecture

```
Mobile App (Expo)  ──>  Express API  ──>  PostgreSQL (Supabase)
                            |
                      Stripe API + Supabase Storage
```

---

## Features

### Authentication
- Email/password registration and login
- Google, Apple, and Microsoft OAuth
- JWT tokens with secure cookie and Bearer header support
- Role-based access: `PLAYER`, `ORGANIZER`, `ADMIN`

### Tournaments
- Create, list, filter, and search tournaments
- Sports: Padel, Tennis, Squash
- Formats: Single Elimination, Double Elimination, Round Robin
- Bracket auto-generation when registration closes
- Doubles team registration
- Tournament chat and announcements
- Invite friends to tournaments

### Matches
- Player-submitted results with opponent confirmation
- Disputed results flagged to organizer
- Auto-advancement through brackets
- Auto-completion when all matches are decided
- Win/loss stat tracking

### Open Matches
- Post and find casual matches outside of tournaments
- Join, cancel, or leave open matches

### Social
- Friend requests (send, accept, decline, remove)
- Follow/unfollow players
- Player profiles with stats and tournament history

### Payments
- Stripe Checkout for paid tournament entry
- Free tournaments bypass payment
- Payment history per user
- Webhook-based registration confirmation

### Mobile UX
- Dark mode (system, light, dark)
- Onboarding flow (sport, skill level, city, avatar)
- Skeleton loaders and empty states
- Offline detection banner
- Push notification token support
- Notification preferences

### Admin
- User search and role management
- Audit logging for sensitive actions

---

## Project Structure

```
balling/
├── mobile/                 React Native (Expo) app
│   ├── src/
│   │   ├── components/     Reusable UI components
│   │   ├── context/        Auth and Theme providers
│   │   ├── hooks/          Custom hooks
│   │   ├── lib/            API client, types, storage, config
│   │   ├── navigation/     Stack and tab navigators
│   │   ├── screens/        All app screens
│   │   └── constants/      Theme colors
│   ├── .env.example
│   └── app.config.ts
│
├── server/                 Express API
│   ├── src/
│   │   ├── routes/         API route handlers
│   │   ├── middleware/      Auth, rate limiting, error handling
│   │   ├── services/       Stripe, bracket generation
│   │   └── lib/            Prisma, validation, audit, logger
│   ├── prisma/
│   │   └── schema.prisma   Database schema
│   ├── tests/              API tests
│   └── .env.example
│
└── client/                 Legacy web app (reference only)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (or a Supabase project)
- Stripe account (test mode for development)

### Server Setup

```bash
cd server
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values

# Run migrations
npx prisma migrate dev

# (Optional) Seed test data
npx prisma db seed

# Start dev server
npm run dev
```

### Mobile Setup

```bash
cd mobile
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API URL and OAuth client IDs

# Start Expo
npm start
```

Scan the QR code with Expo Go, or press `i` for iOS simulator / `a` for Android emulator.

### Stripe Webhooks (local)

```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

---

## Environment Variables

### Server (`server/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (pooled) |
| `DIRECT_URL` | PostgreSQL direct connection (migrations) |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `CLIENT_URL` | Frontend URL for CORS |
| `SERVER_URL` | Server URL for OAuth callbacks |
| `PORT` | Server port (default: 3001) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `SENTRY_DSN` | (Optional) Sentry error tracking |

### Mobile (`mobile/.env`)

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | API server URL |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `EXPO_PUBLIC_GOOGLE_AUTH_URL` | Server URL for Google OAuth flow |
| `EXPO_PUBLIC_MICROSOFT_CLIENT_ID` | Microsoft OAuth client ID |

---

## API Endpoints

### Auth
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | - | Register with email/password |
| POST | `/api/auth/login` | - | Login |
| POST | `/api/auth/logout` | - | Logout |
| GET | `/api/auth/me` | Yes | Get current user |
| PUT | `/api/auth/profile` | Yes | Update profile |
| POST | `/api/auth/google` | - | Google sign in (direct token) |
| GET | `/api/auth/google/start` | - | Google OAuth redirect |
| POST | `/api/auth/apple` | - | Apple sign in |
| POST | `/api/auth/microsoft` | - | Microsoft sign in |

### Tournaments
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/tournaments` | - | List (filterable, paginated) |
| GET | `/api/tournaments/:id` | - | Detail with bracket |
| POST | `/api/tournaments` | Organizer | Create |
| PUT | `/api/tournaments/:id` | Organizer | Update |
| DELETE | `/api/tournaments/:id` | Organizer | Delete |
| POST | `/api/tournaments/:id/join` | Yes | Join (starts Stripe checkout) |
| POST | `/api/tournaments/:id/close-registration` | Organizer | Close and generate brackets |
| POST | `/api/tournaments/:id/cancel` | Organizer | Cancel |
| POST | `/api/tournaments/:id/doubles` | Yes | Register doubles team |
| POST | `/api/tournaments/:id/chat` | Yes | Send chat message |
| GET | `/api/tournaments/:id/chat` | Yes | Get chat messages |
| POST | `/api/tournaments/:id/announce` | Organizer | Post announcement |
| GET | `/api/tournaments/:id/announcements` | - | Get announcements |
| POST | `/api/tournaments/:id/invite/:userId` | Yes | Invite player |
| GET | `/api/tournaments/my` | Yes | My registrations |

### Matches
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| PUT | `/api/matches/:id/result` | Organizer | Record result |
| POST | `/api/matches/:id/submit-result` | Yes | Player submits result |
| GET | `/api/matches/:id/results` | - | Get submitted results |

### Open Matches
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/open-matches/feed` | - | Browse open matches |
| POST | `/api/open-matches` | Yes | Create |
| POST | `/api/open-matches/:id/join` | Yes | Join |
| POST | `/api/open-matches/:id/cancel` | Yes | Cancel |
| POST | `/api/open-matches/:id/leave` | Yes | Leave |

### Social
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/friends/request/:userId` | Yes | Send friend request |
| POST | `/api/friends/accept/:userId` | Yes | Accept |
| POST | `/api/friends/decline/:userId` | Yes | Decline |
| DELETE | `/api/friends/:userId` | Yes | Remove friend |
| GET | `/api/friends` | Yes | List friends |
| GET | `/api/friends/requests` | Yes | Pending requests |
| POST | `/api/follows/:userId` | Yes | Follow |
| DELETE | `/api/follows/:userId` | Yes | Unfollow |
| GET | `/api/follows/following` | Yes | Who I follow |
| GET | `/api/follows/followers` | Yes | My followers |

### Users
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/users/search?q=` | Yes | Search users |
| GET | `/api/users/:id` | - | Public profile |
| GET | `/api/users/:id/stats` | - | User stats |
| GET | `/api/users/:id/tournaments` | - | User tournament history |
| GET | `/api/users/me/payments` | Yes | Payment history |
| GET | `/api/users/admin/search` | Admin | Admin user search |
| PUT | `/api/users/:id/role` | Admin | Change user role |

### Notifications
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/notifications` | Yes | List notifications |
| PUT | `/api/notifications/:id/read` | Yes | Mark as read |
| PUT | `/api/notifications/read-all` | Yes | Mark all as read |
| DELETE | `/api/notifications/:id` | Yes | Delete |

---

## Scripts

### Server

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled server |
| `npm test` | Run tests |
| `npm run admin:ensure` | Ensure admin user exists |
| `npx prisma studio` | Visual database browser |
| `npx prisma migrate dev` | Run migrations |

### Mobile

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npm run ios` | Run on iOS |
| `npm run android` | Run on Android |

---

## Conventions

- `entryFee` is stored in cents (e.g. 1000 = 10.00)
- Dates are ISO 8601 UTC
- API errors return `{ error: string }`
- Input validation uses Zod on both client and server
- All list endpoints are paginated with `?page=&limit=`
- Rate limiting: 100 req/min general, 10/15min auth, 30/min writes
