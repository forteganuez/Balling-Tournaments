# Balling Project Agents — Design Spec

**Date:** 2026-04-01  
**Status:** Approved

## Summary

Six specialized Claude Code skill agents for the Balling project, covering TypeScript quality, code review, security, database health, mobile quality, and API consistency. Each agent has one job and a clear trigger condition.

## Agents

### 1. `typescript-strict`
- **Trigger:** After editing any `.ts` or `.tsx` file
- **Checks:**
  - No `any` — explicit types required
  - All function parameters and return types typed
  - No unjustified type assertions (`as Foo`)
  - Zod schemas match their inferred TypeScript types
  - No unused imports
- **Output:** File path + line number for every violation

### 2. `code-reviewer`
- **Trigger:** Before committing a feature or fix
- **Checks:**
  - No dead code or commented-out blocks
  - No `console.log` in server code (use project logger)
  - No hardcoded values that should be env vars
  - Functions under 40 lines
  - No duplicated logic across routes
  - Follows existing patterns in the codebase

### 3. `security-guard`
- **Trigger:** Any auth, payment, or input-handling change
- **Checks:**
  - All protected routes use `authenticate` middleware
  - All request bodies validated with Zod
  - JWT secret never logged or exposed
  - Stripe amounts in cents (Int), never floats or dollars
  - No raw Prisma SQL unless explicitly reviewed
  - Role checks match route intent (`PLAYER` / `ORGANIZER` / `ADMIN`)

### 4. `db-health`
- **Trigger:** Prisma schema or query changes
- **Checks:**
  - New relations have indexes (`@@index`)
  - No N+1 queries (missing `include`)
  - Migrations are non-destructive (no data loss)
  - `entryFee` stored as `Int` (cents)
  - All relations have explicit `onDelete` behavior
  - `@@index` present on fields used as frequent filters

### 5. `mobile-quality`
- **Trigger:** Any file under `mobile/`
- **Checks:**
  - NativeWind for all styling — no `StyleSheet.create`
  - No inline styles
  - Hooks follow Rules of Hooks
  - No direct `fetch` calls — must go through `mobile/src/lib/api`
  - Navigation uses typed params
  - No hardcoded API URLs
  - Skeleton loaders present for async screens

### 6. `api-consistency`
- **Trigger:** Any file in `server/src/routes/`
- **Checks:**
  - All errors return `{ error: string }`
  - All list endpoints paginated with `?page=&limit=`
  - New routes registered in the router index
  - Zod validation on every request body
  - HTTP status codes correct (401 vs 403, 404 vs 400)
  - Route naming follows existing conventions

## Skill File Locations

All skills go in `.claude/skills/` at the project root, making them project-scoped.

```
.claude/
  skills/
    typescript-strict.md
    code-reviewer.md
    security-guard.md
    db-health.md
    mobile-quality.md
    api-consistency.md
```

## CLAUDE.md Integration

Each agent's trigger condition will be referenced in `CLAUDE.md` under a new `## Agents` section so Claude knows when to invoke each one automatically.
