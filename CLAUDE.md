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
- Never use `include: true` in Prisma for user relations — always use `select` with `SAFE_USER_SELECT` from `src/lib/constants.ts` to avoid leaking email, passwordHash, providerId, expoPushToken.
- Never use mutable values (e.g. `creditsRemaining`) in idempotency keys — always use `crypto.randomUUID()`.
- Never do check-then-update in two separate DB calls — use `updateMany` with conditions in `WHERE` for atomic check-and-set.
- Never process Stripe webhook side effects before checking idempotency — check `WebhookEvent` first, then execute, then record.
- Never repeat authorization checks inline across multiple routes — extract to middleware (e.g. `requireTournamentOrganizerOrAdmin`).
- Never verify access and deduct credits in separate DB operations — wrap both in `$transaction` to prevent TOCTOU.

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

Project-specific agents live in `.claude/skills/`. Invoke them at the trigger points below:

### Quality & Review Agents (original)

| Agent | Invoke when |
|---|---|
| `typescript-strict` | After editing any `.ts` or `.tsx` file |
| `code-reviewer` | Before committing a feature or fix |
| `security-guard` | Any auth, payment, or input-handling change |
| `db-health` | Prisma schema, migration, or query changes |
| `mobile-quality` | Any file changed under `mobile/` |
| `api-consistency` | Any new or changed file in `server/src/routes/` |

To invoke: `/typescript-strict`, `/code-reviewer`, `/security-guard`, `/db-health`, `/mobile-quality`, `/api-consistency`

### Specialist Agents (from wshobson/agents)

| Agent | Invoke when |
|---|---|
| `backend-architect` | Designing new API routes, services, or backend architecture |
| `mobile-developer` | Building or optimizing React Native / Expo features |
| `payment-integration` | Any Stripe checkout, webhook, or billing work |
| `backend-security-coder` | Implementing auth, JWT, input validation, or security hardening |
| `typescript-pro` | Advanced TypeScript types, generics, or strict config issues |
| `tdd-orchestrator` | Writing tests or adopting TDD for a feature |
| `database-architect` | Prisma schema design, migrations, or query optimization |

To invoke: `/backend-architect`, `/mobile-developer`, `/payment-integration`, `/backend-security-coder`, `/typescript-pro`, `/tdd-orchestrator`, `/database-architect`

## Iterate Constantly

Whenever I encounter an error and fix it, I must immediately add the lesson to CLAUDE.md — in the relevant section (Guardrails, Gotchas, or Rules) — so the same mistake is never repeated.

## API Patterns

- **Paginated list responses**: Always return `{ data: [...], pagination: { page, limit, total, pages } }`. Use `paginationQuerySchema` + `getPaginationParams` from `src/lib/validation.ts`. Default limit=20, max=100.
- **Query validation**: Never use raw `parseInt` on query params — use Zod schemas. `mode: 'insensitive'` in Prisma `where` variables must be typed as `Prisma.QueryMode.insensitive` (not a raw string) to satisfy TypeScript.
- **Privacy checks**: `GET /:id/stats` and `GET /:id/tournaments` require `optionalAuth` + `profileVisible`/`showMatchHistory` checks. Return 404 (not 403) for private profiles to avoid user enumeration.
- **Shared `where` variable with Prisma**: Passing the same `where` variable to both `findMany` and `count` in `Promise.all` can confuse TypeScript's generic inference. Inline the `where` in `findMany` if relation fields (`requester`, `receiver`) are missing from the inferred type.
- **Test assertions after pagination**: Tests that check `Array.isArray(res.body)` must be updated to `Array.isArray(res.body.data)` after wrapping responses in `{ data, pagination }`.

## Security & Payment Patterns

- **Safe user select**: Always import `SAFE_USER_SELECT` from `src/lib/constants.ts` when returning user data in relations. Never expose raw user objects.
- **Atomic joins**: Use `updateMany` with `WHERE opponentId = null` (or equivalent) instead of `findUnique + update`. If `count === 0`, the slot was taken — return 409.
- **Credit deduction**: Always deduct credits inside the same `$transaction` that updates the match status. A failed credit check must roll back the match update.
- **Webhook guard**: `WebhookEvent` table prevents duplicate processing. Check before side effects, record after. `stripeTransactionId` on `CreditPack` is `@unique` as a second layer.
- **Tournament auth**: Use `requireTournamentOrganizerOrAdmin` middleware on PUT, DELETE, close-registration, cancel, announce. It attaches `req.tournament` (id, organizerId, name, status) — no second `findUnique` needed in handler.
- **Prisma mocks consume once**: When a test uses `mockResolvedValueOnce`, each `findUnique` call consumes one mock. If middleware + handler both call `findUnique`, provide two mocks or move data to `req` (e.g. `req.tournament`) to avoid the second call.
- **`prisma db push`**: Use for local dev when `prisma migrate dev` fails in non-interactive environment. Requires `--accept-data-loss` if adding `@unique` to existing column.
- **User schema**: No `rating` field on `User` — ratings are per-sport in `UserSportRating`. Avatar field is `avatarUrl`, not `profilePictureUrl`.

## P2 Lessons Learned

- **Upload validation**: Always validate `bucket` with `z.enum(['avatars','covers'])` and verify file content with magic bytes (JPEG: `[0xff,0xd8,0xff]`, PNG: `[0x89,0x50,0x4e,0x47]`, WebP: `[0x52,0x49,0x46,0x46]`) — MIME header alone is spoofable.
- **Route params with enum values**: Use `z.enum` + `.safeParse` on `:sport` params instead of `.includes()` checks — gives consistent error format and TypeScript type narrowing with no cast needed.
- **Stable pagination sort**: Any `orderBy: { createdAt: 'desc' }` must have a secondary `{ id: 'desc' }` to avoid page skips when two records share a timestamp.
- **Duplicate route handlers**: Never export a handler from a router file just to re-mount it elsewhere — keep one canonical route (`/api/tournaments/my`) and delete the legacy alias.
- **`catch (err: any)`**: Always use `err: unknown` in catch blocks. Extract message with `err instanceof Error ? err.message : String(err)` — never cast to `any`.
- **Prisma types over `Record<string, unknown>`**: Use `Prisma.ModelUpdateInput` for dynamic update objects and `Prisma.ModelWhereInput` for dynamic where clauses — provides compile-time safety and eliminates runtime surprises.
- **`EnumFieldFilter` in dynamic where**: Setting `where.status = status` when `where` is typed as `Prisma.CompetitiveMatchWhereInput` requires casting to `Prisma.EnumCompetitiveMatchStatusFilter` or using a narrowed string union.

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
- **Web Client**: Always validate `import.meta.env.VITE_API_URL` exists before creating the axios instance — missing env var causes all requests to fail silently with `baseURL: undefined`.
- **Web Client**: Axios error messages are nested at `err.response.data.error` (our `{ error: string }` format) — when catching API errors, extract from that path before falling back to `err.message`.
- **Web Client**: Tournament format labels, short labels, status colors/labels, and valid sport/status arrays live in `src/lib/constants.ts` — import from there, do not re-declare locally.
- **Web Client**: URL search params must be validated against allowed values before casting to enum types — use the `SPORTS` and `TOURNAMENT_STATUSES` arrays from `src/lib/constants.ts`.
- **Web Client**: Never use `window.confirm()` for destructive actions — use inline two-step confirmation (first click requests, second click executes via a confirm/cancel button pair).
