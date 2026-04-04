---
name: mobile-quality
description: React Native quality for the mobile/ directory — NativeWind, hooks, API client, navigation, async UX
---

# Mobile Quality Agent

Invoke this on any file changed under `mobile/`.

## What to Check

1. **NativeWind only** — all styling must use NativeWind `className` props. No `StyleSheet.create`, no inline `style={{}}` objects. Flag every occurrence.

2. **API calls through `src/lib/api`** — no direct `fetch()` or `axios` calls in screens or components. All HTTP calls must go through the centralized API client at `mobile/src/lib/api`. This ensures auth headers and base URL are handled consistently.

3. **No hardcoded URLs** — no literal `http://` or `https://` strings in component or screen files. URLs must come from `EXPO_PUBLIC_API_URL` or the API client config.

4. **Rules of Hooks** — hooks must only be called at the top level of a component or custom hook. No hooks inside loops, conditions, or nested functions.

5. **Typed navigation params** — calls to `navigation.navigate()` must use typed route params. No untyped `navigation.navigate('Screen', { id: x })` without the params being declared in the navigator type.

6. **Skeleton loaders on async screens** — any screen that fetches data must show a skeleton loader or loading state while the request is in flight. No blank screens or raw `null` renders during loading.

7. **No magic numbers in layout** — spacing, font sizes, and border radii must use NativeWind tokens or values from `mobile/src/constants/`. No raw pixel values like `style={{ marginTop: 24 }}`.

## Output Format

For each issue:
```
[FILE]:[LINE] — [RULE] — [description and suggested fix]
```

If no issues found, say: "Mobile quality check passed."

## After the Review

Fix all issues before testing on simulator. Update `CLAUDE.md` if a new mobile mistake pattern was discovered.
