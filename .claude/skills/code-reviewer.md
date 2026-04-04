---
name: code-reviewer
description: General code review before committing — dead code, logging, hardcoded values, function size, duplication
---

# Code Reviewer Agent

Invoke this before committing any feature or fix.

## What to Check

1. **No dead code** — no commented-out blocks, unreachable branches, or unused variables/functions.

2. **No `console.log` in server code** — all server logging must use `src/lib/logger`. `console.log` is only acceptable in one-off scripts or seeds.

3. **No hardcoded values that belong in env vars** — URLs, secrets, API keys, port numbers, and environment-specific strings must come from `process.env`. Flag any literal that looks like it should be configurable.

4. **Function length** — functions over 40 lines should be decomposed unless the length is justified by a single, linear operation (e.g., a long Zod schema or a migration).

5. **No duplicated logic** — if the same pattern appears in more than one route or component, flag it and suggest extracting a shared utility or middleware.

6. **Pattern consistency** — new code must follow the conventions already established in the file and its neighbors. If existing code uses a pattern differently, flag the divergence.

## Output Format

For each issue:
```
[FILE]:[LINE] — [RULE] — [description and suggested fix]
```

If no issues are found, say: "Code review passed."

## After the Review

Fix all flagged issues before committing. If a recurring mistake was discovered, update `CLAUDE.md`.
