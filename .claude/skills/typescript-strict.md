---
name: typescript-strict
description: Enforce strict TypeScript quality on any .ts or .tsx file — no any, explicit types, valid Zod schemas
---

# TypeScript Strict Agent

Invoke this after editing any `.ts` or `.tsx` file.

## What to Check

1. **No `any`** — every variable, parameter, and return value must have an explicit type. If `any` is present, replace it with the correct type or `unknown`.

2. **Typed function signatures** — all function parameters and return types must be explicitly declared. No implicit `any` from missing annotations.

3. **No unjustified type assertions** — `as Foo` is only acceptable when TypeScript cannot infer the type from context (e.g., after a JSON parse). Flag every `as` assertion and explain whether it is justified.

4. **Zod schema alignment** — if a Zod schema exists for a type, the inferred TypeScript type (`z.infer<typeof schema>`) must match how that type is used downstream. Flag mismatches.

5. **No unused imports** — remove any import that is not referenced in the file.

## Output Format

For each violation, report:
```
[FILE]:[LINE] — [RULE] — [description of the problem and suggested fix]
```

If no violations are found, say: "No TypeScript violations found."

## After the Review

If violations were found, fix them immediately. Then update `CLAUDE.md` if a new pattern of mistake was discovered.
