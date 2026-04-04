---
name: api-consistency
description: REST API consistency for server/src/routes/ — error format, pagination, Zod, status codes, router registration
---

# API Consistency Agent

Invoke this on any new or modified file in `server/src/routes/`.

## What to Check

1. **Error response format** — every error response must be `{ error: string }`. No `{ message: ... }`, `{ msg: ... }`, or raw strings. Flag any deviation.

2. **Pagination on list endpoints** — any route returning an array of records must accept `?page=` and `?limit=` query params and return paginated results. Flag list endpoints missing pagination.

3. **Zod validation on all request bodies** — every `POST`, `PUT`, and `PATCH` route must parse `req.body` through a Zod schema before accessing any field. No raw `req.body.field` without prior validation.

4. **Router registration** — new route files must be imported and mounted in the main router (`server/src/index.ts` or the router entry point). Flag any route file that exists but is not registered.

5. **Correct HTTP status codes:**
   - `400` — bad input (malformed request, validation error)
   - `401` — not authenticated (no/invalid token)
   - `403` — authenticated but not authorized (wrong role)
   - `404` — resource not found
   - `409` — conflict (duplicate registration, etc.)
   - `500` — unexpected server error
   Flag mismatches (e.g., returning `400` when the user is just unauthorized).

6. **Route naming conventions** — new routes must follow the existing pattern:
   - Resource-based: `/api/<resource>` and `/api/<resource>/:id`
   - Actions as sub-paths: `/api/<resource>/:id/<action>`
   - No verbs in the base path (e.g., not `/api/getTournaments`)

## Output Format

For each issue:
```
[FILE]:[LINE] — [RULE] — [description and suggested fix]
```

If no issues found, say: "API consistency check passed."

## After the Review

Fix all issues before testing the endpoint. Update `CLAUDE.md` if a new API mistake pattern was discovered.
