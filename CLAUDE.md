# Balling

Tournament platform for padel, tennis, and squash — React Native mobile app with an Express API backend targeting App Store and Google Play.

## Tech Stack

- **Mobile:** React Native · Expo · NativeWind · React Navigation
- **Backend:** Node.js · Express · TypeScript · Prisma · PostgreSQL (Supabase)
- **Auth:** JWT · Google · Apple · Microsoft OAuth
- **Payments:** Stripe Checkout + Webhooks
- **Storage:** Supabase Storage
- **Validation:** Zod (client + server)

## Key Commands

```bash
# Server
cd server && npm run dev          # dev server with hot reload
cd server && npm test             # run tests
cd server && npm run build        # compile TypeScript
npx prisma migrate dev            # run migrations
npx prisma studio                 # database browser

# Mobile
cd mobile && npm start            # Expo dev server
cd mobile && npm run ios          # iOS simulator
cd mobile && npm run android      # Android emulator
```

## Code Style Rules

- Use functional components and hooks — no class components.
- TypeScript only — never use `any`; define types explicitly.
- Use NativeWind for all styling — no inline `StyleSheet.create`.
- Validate all user input and API boundaries with Zod.
- API errors must return `{ error: string }`.
- Dates are ISO 8601 UTC. `entryFee` is stored in cents (1000 = $10.00).
- All list endpoints must be paginated with `?page=&limit=`.
- Use Prisma for all DB access — no raw SQL unless absolutely necessary.

## Guardrails

- Never use `any` in TypeScript — define explicit types.
- Never bypass auth middleware on protected routes.
- Never commit secrets or `.env` files.
- Never create a new API route without updating the relevant route file and verifying it follows existing patterns.
- Never skip Zod validation on request bodies.
- Never use `console.log` in server code — use the project logger (`src/lib/logger`).
- Stripe amounts are always in cents — never in dollars.
- Role checks: `PLAYER`, `ORGANIZER`, `ADMIN` — always enforce the correct role per route.

## Verification (run after every change)

1. `cd server && npm run build` — must compile with no errors.
2. `cd server && npm test` — all tests must pass.
3. If a new route was added, confirm it appears in the correct router file and follows existing patterns.
4. If schema changed, run `npx prisma migrate dev` and confirm no breaking changes.

## Architecture Notes

```
mobile/ → React Native (Expo) app
server/ → Express API
  src/routes/     API route handlers
  src/middleware/ Auth, rate limiting, error handling
  src/services/   Stripe, bracket generation
  src/lib/        Prisma, validation, audit, logger
  prisma/         DB schema and migrations
  tests/          API tests
client/           Legacy web app (reference only — do not modify)
```

## Agents

Six project-specific agents live in `.claude/skills/`. Invoke them at the trigger points below:

| Agent | Invoke when |
|---|---|
| `typescript-strict` | After editing any `.ts` or `.tsx` file |
| `code-reviewer` | Before committing a feature or fix |
| `security-guard` | Any auth, payment, or input-handling change |
| `db-health` | Prisma schema, migration, or query changes |
| `mobile-quality` | Any file changed under `mobile/` |
| `api-consistency` | Any new or changed file in `server/src/routes/` |

To invoke: `/typescript-strict`, `/code-reviewer`, `/security-guard`, `/db-health`, `/mobile-quality`, `/api-consistency`

## Iterate Constantly

Whenever I encounter an error and fix it, I must immediately add the lesson to CLAUDE.md — in the relevant section (Guardrails, Gotchas, or Rules) — so the same mistake is never repeated.

## Common Gotchas

- `entryFee = 0` means free tournament — skip Stripe, register directly.
- Bracket generation happens only when organizer closes registration.
- Doubles team registration is a separate endpoint from singles join.
- JWT is sent as a cookie AND Bearer header — middleware supports both.
- OAuth callbacks are server-side redirects — not handled in the mobile app directly.
- Rate limits: 100 req/min general · 10/15min auth · 30/min writes.
- **Web Client**: All pages use light beige theme (#f3eee5 bg, #191510 text) — do NOT use dark theme tokens. Navbar is sticky light beige across all pages.
- **Web Client**: BalanceResponse API has structure `{ credits: { total: number }, subscription: {...} }` — always access as `balanceRes.data.credits.total`, not `totalCredits`.
- **Web Client**: Navbar should apply light beige styling to all pages, not a conditional "editorial shell" pattern. Keep navbar styles consistent across entire app.
- **Web Client**: Color references in components must use beige theme hex colors (#c4a47a, #d8ccb9, #f8f4ed, etc.) — never use Tailwind dark tokens (base, surface, accent) in light-themed pages.
