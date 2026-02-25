# Fix: AI Analysis "Crédits insuffisants" false positive + catch block générique

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the false "Crédits insuffisants" error when launching AI analysis despite having sufficient credits.

**Architecture:** The root cause is a PostgreSQL CHECK constraint on `credit_transactions.service_type` that doesn't include `'ai_analysis'` or `'mention_analysis'`. The secondary issue is a generic catch block that masks the real DB error as a credit error. Fix both via a DB migration + targeted catch block improvement.

**Tech Stack:** Knex migrations (PostgreSQL), Express controller error handling

---

### Task 1: Add migration to extend service_type CHECK constraint

**Files:**
- Create: `backend/src/database/migrations/20260225100000_add_ai_analysis_service_types.ts`

**Step 1: Write the migration**

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE credit_transactions
    DROP CONSTRAINT IF EXISTS credit_transactions_service_type_check;
  `);

  await knex.raw(`
    ALTER TABLE credit_transactions
    ADD CONSTRAINT credit_transactions_service_type_check
    CHECK (service_type IN (
      'facebook_posts',
      'facebook_pages',
      'marketplace',
      'facebook_pages_benchmark',
      'facebook_pages_calendar',
      'facebook_pages_copywriting',
      'ai_analysis',
      'mention_analysis'
    ));
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE credit_transactions
    DROP CONSTRAINT IF EXISTS credit_transactions_service_type_check;
  `);

  await knex.raw(`
    ALTER TABLE credit_transactions
    ADD CONSTRAINT credit_transactions_service_type_check
    CHECK (service_type IN (
      'facebook_posts',
      'facebook_pages',
      'marketplace',
      'facebook_pages_benchmark',
      'facebook_pages_calendar',
      'facebook_pages_copywriting'
    ));
  `);
}
```

**Step 2: Verify migration file exists and is syntactically valid**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors related to this file

**Step 3: Commit**

```
git add backend/src/database/migrations/20260225100000_add_ai_analysis_service_types.ts
git commit -m "fix: add ai_analysis + mention_analysis to credit_transactions service_type constraint"
```

---

### Task 2: Fix generic catch block in facebookPagesController

**Files:**
- Modify: `backend/src/controllers/facebookPagesController.ts:547-557`

**Step 1: Read current catch block** (lines 547-557)

Current code:
```typescript
try {
  reservation = await creditService.reserveCredits(
    userId, cost, 'ai_analysis',
    `ai_${sessionId}_${pageName.replace(/\s+/g, '_')}`,
    `Analyse IA: ${pageName} (${postsData.length} posts)`
  );
} catch (error) {
  const userBalance = await creditService.getUserCreditBalance(userId);
  logger.warn(`[AI] Insufficient credits for user ${userId}: required=${cost}, available=${userBalance.total}, model=${modelId}`);
  throw new ApiError(402, `Crédits insuffisants. Requis: ${cost.toFixed(1)}, disponible: ${userBalance.total.toFixed(1)}`);
}
```

**Step 2: Replace with error-aware catch block**

New code:
```typescript
try {
  reservation = await creditService.reserveCredits(
    userId, cost, 'ai_analysis',
    `ai_${sessionId}_${pageName.replace(/\s+/g, '_')}`,
    `Analyse IA: ${pageName} (${postsData.length} posts)`
  );
} catch (error: any) {
  const errMsg = error?.message || String(error);
  if (errMsg.toLowerCase().includes('insufficient') || errMsg.toLowerCase().includes('insuffisant')) {
    const userBalance = await creditService.getUserCreditBalance(userId);
    logger.warn(`[AI] Insufficient credits for user ${userId}: required=${cost}, available=${userBalance.total}, model=${modelId}`);
    throw new ApiError(402, `Crédits insuffisants. Requis: ${cost.toFixed(1)}, disponible: ${userBalance.total.toFixed(1)}`);
  }
  logger.error(`[AI] Credit reservation failed for user ${userId}: ${errMsg}`, { sessionId, pageName, cost, modelId });
  throw new ApiError(500, `Erreur lors de la réservation des crédits: ${errMsg}`);
}
```

**Step 3: Verify backend compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```
git add backend/src/controllers/facebookPagesController.ts
git commit -m "fix: distinguish credit errors from DB errors in AI analysis catch block"
```

---

### Task 3: Check for same pattern in benchmark endpoint

**Files:**
- Modify: `backend/src/controllers/facebookPagesController.ts` (benchmark method, similar catch block if present)

**Step 1: Search for similar generic catch blocks**

Search for other `reserveCredits` calls wrapped in catch blocks that always throw 402.

**Step 2: Apply the same fix pattern** to any other generic catch blocks found.

**Step 3: Verify backend compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```
git commit -m "fix: apply error-aware catch blocks to all credit reservation points"
```

---

### Task 4: Run migration on production DB

**Step 1: Run the migration**

Run: `cd backend && npx knex migrate:latest`
Expected: Migration `20260225100000_add_ai_analysis_service_types` applied

**Step 2: Verify constraint**

Run: `npx knex raw "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'credit_transactions_service_type_check'"`
Expected: Shows constraint including `ai_analysis` and `mention_analysis`

---

### Task 5: Build & verify

**Step 1: Backend compile**

Run: `cd backend && npx tsc --noEmit`
Expected: PASS

**Step 2: Frontend compile**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Build O2Switch**

Run: `bash build-O2Switch.sh`
Expected: PASS

**Step 4: Final commit & push**

```
git push
```

---

## Fichiers modifiés (résumé)

| Fichier | Action |
|---|---|
| `backend/src/database/migrations/20260225100000_add_ai_analysis_service_types.ts` | CREATE - migration ajoutant `ai_analysis` + `mention_analysis` au CHECK constraint |
| `backend/src/controllers/facebookPagesController.ts` | EDIT - catch blocks intelligents (distinguish credit vs DB errors) |
