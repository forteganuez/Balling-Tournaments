---
name: db-health
description: Prisma schema and query health — indexes, N+1s, safe migrations, onDelete, entryFee as cents
---

# DB Health Agent

Invoke this on any Prisma schema change, new migration, or new/modified database query.

## What to Check

### Schema (`prisma/schema.prisma`)

1. **Indexes on relations** — every foreign key field used in a `where`, `orderBy`, or `include` filter must have a `@@index`. Flag any relation field missing one.

2. **`onDelete` on all relations** — every `@relation` must declare explicit `onDelete` behavior (`Cascade`, `Restrict`, or `SetNull`). No implicit defaults.

3. **`entryFee` as `Int`** — must always be stored as `Int` (cents). Never `Float` or `Decimal`. Flag any field that stores a monetary value as a non-integer type.

4. **Non-destructive migrations** — new migrations must not drop columns, rename columns, or change column types without a multi-step migration strategy. Flag any migration that could cause data loss.

### Queries (route handlers and services)

5. **N+1 detection** — any loop that calls a Prisma query inside it is an N+1. Rewrite using `include`, `select`, or a batched `findMany` with `in`.

6. **Missing `include`** — if a route returns nested data (e.g., tournament with participants), verify the query uses `include` rather than making separate queries per record.

7. **No raw SQL with interpolation** — `$queryRaw` and `$executeRaw` must use tagged template literals with parameterized values only. Never string concatenation.

## Output Format

For each issue:
```
[FILE]:[LINE] — [RULE] — [description and suggested fix]
```

If no issues found, say: "DB health check passed."

## After the Review

Fix all issues before running `npx prisma migrate dev`. Update `CLAUDE.md` if a new DB mistake pattern was discovered.
