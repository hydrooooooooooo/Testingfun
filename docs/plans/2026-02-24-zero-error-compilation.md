# Phase 7: Zero-Error Compilation & Dead Code Cleanup

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate all 14 remaining backend TypeScript compilation errors and remove dead code.

**Architecture:** Fix broken imports (logger functions that don't exist), simplify loggingMiddleware to use available logger exports, add missing `items_scraped` property to Session interface.

**Tech Stack:** TypeScript, Winston logger, Express middleware

---

## Task 1: Fix loggingMiddleware - replace nonexistent logger imports

**Files:**
- Modify: `backend/src/middlewares/loggingMiddleware.ts`

**Problem:** Imports 5 functions from logger that don't exist: `LogCategory`, `runWithContext`, `setContextValue`, `getLogContext`, `logSlowRequest`. The logger only exports `logger` (Winston) and `audit()`.

**Step 1: Replace imports**

Change line 3 from:
```typescript
import { logger, LogCategory, runWithContext, setContextValue, getLogContext, logSlowRequest } from '../utils/logger';
```
To:
```typescript
import { logger } from '../utils/logger';
```

**Step 2: Fix `requestContextMiddleware` (line 42)**

Replace `runWithContext(context, () => { next(); });` with just `next();` — the context object is already set on `req` via `req.requestId`.

**Step 3: Fix `httpLoggingMiddleware` (lines 56, 83)**

Replace all `category: LogCategory.API` with `category: 'api'` (string literal).

**Step 4: Fix `logSlowRequest` call (lines 107-112)**

Replace:
```typescript
logSlowRequest(req.method, req.originalUrl, duration, slowThreshold, {
  requestId, statusCode, userId: (req as any).user?.id, ip: req.ip
});
```
With:
```typescript
logger.warn(`Slow request: ${req.method} ${req.originalUrl} took ${duration}ms (threshold: ${slowThreshold}ms)`, {
  category: 'performance', requestId, statusCode, userId: (req as any).user?.id, ip: req.ip, duration
});
```

**Step 5: Fix `errorLoggingMiddleware` (line 168)**

Replace `category: LogCategory.API` with `category: 'api'`.

**Step 6: Fix `userContextMiddleware` (line 125)**

Replace `setContextValue('userId', user.id);` with a no-op or just log it:
```typescript
logger.debug(`User context set: userId=${user.id}`);
```

**Step 7: Verify**

Run: `cd backend && npx tsc --noEmit 2>&1 | grep loggingMiddleware || echo "OK"`

---

## Task 2: Fix benchmarkService, mentionDetectionService, openRouterCostService

**Files:**
- Modify: `backend/src/services/benchmarkService.ts` (line 2, 534)
- Modify: `backend/src/services/mentionDetectionService.ts` (line 2, 290)
- Modify: `backend/src/services/openRouterCostService.ts` (line 3, 102, 197)

**Problem:** All three import `logAiCall` and `logAiError` from logger — neither exists.

**Pattern:** `logAiError(operation, error, meta)` → `logger.error(`[AI] ${operation}`, { error: error.message, ...meta })`

**Step 1: Fix benchmarkService.ts**

Line 2: change `import { logger, logAiCall, logAiError } from '../utils/logger';` to `import { logger } from '../utils/logger';`

Line 534: replace `logAiError('OpenRouter.benchmarkAnalysis', error, { ... })` with:
```typescript
logger.error('[AI] OpenRouter.benchmarkAnalysis', { error: (error as Error).message, ...meta });
```
(where `meta` is the existing object argument)

**Step 2: Fix mentionDetectionService.ts**

Line 2: same import fix.
Line 290: same pattern replacement.

**Step 3: Fix openRouterCostService.ts**

Line 3: same import fix.
Line 102: same pattern replacement.
Line 197: same pattern replacement.

**Step 4: Verify**

Run: `cd backend && npx tsc --noEmit 2>&1 | grep -E "(benchmarkService|mentionDetection|openRouterCost)" || echo "OK"`

---

## Task 3: Add `items_scraped` to Session interface

**Files:**
- Modify: `backend/src/services/sessionService.ts`

**Problem:** `scheduledScrapeService.ts` accesses `sessionData?.items_scraped` but Session interface lacks this field. The column exists in DB (added by migration `20251121140003`).

**Step 1: Add field**

In the `Session` interface, add after `data_types`:
```typescript
items_scraped?: number;
```

**Step 2: Verify**

Run: `cd backend && npx tsc --noEmit 2>&1 | grep scheduledScrapeService || echo "OK"`

---

## Task 4: Full compilation verification + commit

**Step 1: Run full backend compilation**

Run: `cd backend && npx tsc --noEmit 2>&1`
Expected: 0 errors.

**Step 2: Run full frontend compilation**

Run: `npx tsc --noEmit 2>&1`
Expected: 0 errors.

**Step 3: Commit**

```bash
git add backend/src/middlewares/loggingMiddleware.ts backend/src/services/benchmarkService.ts backend/src/services/mentionDetectionService.ts backend/src/services/openRouterCostService.ts backend/src/services/sessionService.ts
git commit -m "fix: resolve all 14 backend TS compilation errors"
```

---

## Summary

| Task | Files | Errors fixed |
|------|-------|-------------|
| 1 | loggingMiddleware.ts | 5 (missing logger exports) |
| 2 | benchmarkService + mentionDetection + openRouterCost | 6 (logAiCall/logAiError) |
| 3 | sessionService.ts | 3 (items_scraped) |
| 4 | Verify + commit | 0 (validation) |

**Total: 14 errors → 0 errors**
