# Web Client Design — Balling

**Date:** 2026-04-02  
**Status:** Approved

---

## Context

The existing `client/` folder is a legacy React web app (light/default Tailwind, cookie-based auth, no payments or credit system). The goal is to build a new `web/` client with:

- A premium dark design system matching patatbroodje.com aesthetics
- Supabase-based auth (replacing custom cookie session endpoints)
- Full credit/Baller subscription purchase flow (Stripe via server)
- All the useful pages from `client/` ported and restyled

`client/` will be kept as reference; its best UI components (BracketView, RoundRobinView, TournamentCard, Countdown, SportIcon) are ported into `web/` with the new design.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Bundler / framework | Vite + React 18 + TypeScript (strict) |
| Styling | Tailwind CSS with custom brand tokens |
| Routing | React Router v6 |
| HTTP client | Axios with auth interceptor |
| Auth | `@supabase/supabase-js` — email/password + OAuth |
| UI components | Custom only — no component library |

---

## Design System

Configure in `tailwind.config.ts`:

```
colors.base:    #0d0d0d   (page background)
colors.surface: #1a1a1a   (cards, inputs)
colors.border:  #2a2a2a   (card borders, dividers)
colors.accent:  #22c55e   (buttons, highlights, icons)
colors.primary: #ffffff   (headings, labels)
colors.muted:   #9ca3af   (secondary text, placeholders)
```

**Typography:** Inter (loaded via Google Fonts in `index.html`) — 700/800 for headings, 400 for body.  
**Style rules:** No gradients, no box shadows. Flat and clean. Generous padding. Buttons: `bg-accent text-white rounded-lg hover:bg-green-600`.

---

## Auth Flow

1. LoginPage / RegisterPage call `supabase.auth.signInWithPassword()` or `supabase.auth.signUp()`
2. On mount, `AuthContext` calls `supabase.auth.getSession()` — if a session exists, fetches server user via `GET /api/auth/me` with `Authorization: Bearer <access_token>`
3. Server verifies token via Supabase admin, auto-creates DB user if first login
4. `AuthContext` stores: `{ id, name, email, role, isBaller, matchesPlayed, wins, losses }` from `/api/auth/me`, plus `{ credits, ballerExpiresAt }` from `GET /api/monetization/balance` (called in parallel on mount)
5. Axios interceptor reads token from Supabase session before each request
6. On 401 response: clear Supabase session + redirect to `/login`

---

## Environment Variables

```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

---

## Project Structure

```
web/
├── index.html                    Inter font link + root div
├── vite.config.ts
├── tailwind.config.ts            Brand tokens
├── tsconfig.json                 strict: true
├── package.json
├── .env.example
└── src/
    ├── main.tsx
    ├── App.tsx                   Router + AuthProvider
    ├── lib/
    │   └── supabase.ts           createClient() with env vars
    ├── api/
    │   └── client.ts             Axios instance — Bearer token from Supabase session, 401 handler
    ├── context/
    │   └── AuthContext.tsx       user, isLoading, login, logout, refetch
    ├── components/
    │   ├── Navbar.tsx            Logo, links, credits pill, auth state
    │   ├── Footer.tsx
    │   ├── ProtectedRoute.tsx    Redirects to /login if unauthenticated
    │   ├── BracketView.tsx       Ported + restyled (dark surface cards)
    │   ├── RoundRobinView.tsx    Ported + restyled
    │   ├── TournamentCard.tsx    Ported + restyled (dark card, green badge)
    │   ├── Countdown.tsx         Ported + restyled
    │   └── SportIcon.tsx         Ported (emoji, no restyle needed)
    └── pages/
        ├── HomePage.tsx
        ├── LoginPage.tsx
        ├── RegisterPage.tsx
        ├── DashboardPage.tsx
        ├── PricingPage.tsx
        ├── PaymentSuccessPage.tsx
        ├── PaymentCancelPage.tsx
        ├── TournamentsPage.tsx
        ├── CreateTournamentPage.tsx
        ├── TournamentDetailPage.tsx
        ├── ManageTournamentPage.tsx
        └── OrganizerDashboardPage.tsx
```

---

## Routes

| Path | Component | Guard |
|---|---|---|
| `/` | HomePage | Public |
| `/login` | LoginPage | Redirect if authed |
| `/register` | RegisterPage | Redirect if authed |
| `/dashboard` | DashboardPage | Protected |
| `/pricing` | PricingPage | Public |
| `/payment/success` | PaymentSuccessPage | Protected |
| `/payment/cancel` | PaymentCancelPage | Public |
| `/tournaments` | TournamentsPage | Public |
| `/tournaments/new` | CreateTournamentPage | Protected + ORGANIZER |
| `/tournaments/:id` | TournamentDetailPage | Public |
| `/tournaments/:id/manage` | ManageTournamentPage | Protected + ORGANIZER |
| `/organizer` | OrganizerDashboardPage | Protected + ORGANIZER |

---

## Page Specifications

### HomePage (`/`)
- Hero: bold heading "The Racket Sports Platform for Students", subheading (Groningen/university), CTAs: "Join Now" (green) + "See Pricing" (ghost)
- Features: 3 dark cards — Competitive Matches / Live Rankings / Tournaments — green icon, short description
- How it works: 3 steps (Sign up → Buy credits → Play & rank up)
- CTA banner: "Ready to play?" + sign up button

### LoginPage (`/login`)
- Centered dark surface card
- Email + password fields (Zod validation)
- "Log in" button → `supabase.auth.signInWithPassword()` → redirect to `/dashboard`
- Link to `/register`
- Show error message on failed login

### RegisterPage (`/register`)
- Same card style as login
- Name + email + password + confirm password
- `supabase.auth.signUp()` → sets `options.data.name` → redirect to `/dashboard`

### DashboardPage (`/dashboard`)
- Greeting: "Welcome back, {name}"
- Stats row: credits, ELO rating, matches played
- Quick actions: "Find a Match" (placeholder), "Join Tournament" → `/tournaments`, "Buy Credits" → `/pricing`
- Recent activity placeholder (empty state)

### PricingPage (`/pricing`)
- Title: "Get Credits or Go Baller"
- Credit packs (3 cards):
  - Starter: 10 credits — €2.99 → `POST /api/monetization/buy-credits { packSize: 10 }`
  - Popular (green border): 25 credits — €6.99 → `POST /api/monetization/buy-credits { packSize: 25 }`
  - Best Value: 50 credits — €12.99 → `POST /api/monetization/buy-credits { packSize: 50 }`
- Baller subscription card:
  - €7.99/month → `POST /api/monetization/subscribe`
  - Benefits: unlimited competitive matches, Baller badge, priority matchmaking
  - If already Baller: show "You're a Baller 🎾" with expiry date
- All purchase buttons: loading spinner while awaiting response, then `window.location.href = checkoutUrl`

### PaymentSuccessPage (`/payment/success`)
- "Payment successful! 🎾"
- Refetch credits via `GET /api/monetization/balance`, show updated credits
- CTA: "Go to Dashboard"

### PaymentCancelPage (`/payment/cancel`)
- "Payment cancelled"
- CTA: "Back to Pricing"

### TournamentsPage (`/tournaments`)
- Ported from `client/` — browse tournaments with sport/status/search filters
- Uses `TournamentCard` component (restyled)

### TournamentDetailPage (`/tournaments/:id`)
- Ported from `client/` — tournament info, registration (join + pay), `BracketView` / `RoundRobinView`, `Countdown`

### CreateTournamentPage (`/tournaments/new`)
- Ported from `client/` — form to create tournament (name, sport, format, date, location, entry fee, etc.)

### ManageTournamentPage (`/tournaments/:id/manage`)
- Ported from `client/` — registrations table, bracket editing, match result entry, close/cancel actions

### OrganizerDashboardPage (`/organizer`)
- Ported from `client/` — organizer's tournament list + stats (total tournaments, players, revenue)

---

## API Endpoint Map

| Action | Method + Path | Payload |
|---|---|---|
| Get current user | `GET /api/auth/me` | — |
| Buy credit pack | `POST /api/monetization/buy-credits` | `{ packSize: 10\|25\|50 }` |
| Subscribe Baller | `POST /api/monetization/subscribe` | — |
| Get credit balance | `GET /api/monetization/balance` | — (returns `{ totalCredits, subscription }`) |
| List tournaments | `GET /api/tournaments` | `?page&limit&sport&status` |
| Get tournament | `GET /api/tournaments/:id` | — |
| Create tournament | `POST /api/tournaments` | body |
| Join tournament | `POST /api/tournaments/:id/join` | — |
| Close registration | `POST /api/tournaments/:id/close-registration` | — |
| Cancel tournament | `POST /api/tournaments/:id/cancel` | — |
| Submit match result | `PUT /api/matches/:id` | `{ winnerId, score }` |

---

## Constraints

- TypeScript strict — no implicit `any`
- All API errors caught and shown to user (never crash silently)
- ProtectedRoute redirects to `/login` if not authenticated
- Mobile responsive — all pages work at 375px width
- No `console.log` in production code
- Tailwind only — no inline styles or `StyleSheet.create`
- Inter font loaded via `<link>` in `index.html`

---

## Verification

After implementation:

1. `cd web && npm install && npm run dev` — no errors, opens on port 5174
2. `npm run build` — TypeScript compiles clean
3. Login with a Supabase test user → token stored in session → redirect to `/dashboard`
4. PricingPage purchase button → spinner → redirect to Stripe Checkout URL
5. All 12 pages render without crashing on desktop and at 375px width
6. Navbar shows credits pill when logged in, auth buttons when logged out
7. BracketView renders correctly in TournamentDetailPage with mock data
