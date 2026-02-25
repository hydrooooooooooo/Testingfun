# Marketplace URL Validation + Error Display Fix

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Accept `web.facebook.com` Marketplace URLs and show real backend error messages instead of generic "Une erreur est survenue".

**Architecture:** Two independent fixes: (1) widen the regex in `scrapeController.ts:461-463` to accept `web.` and `m.` subdomains (the Zod schema in `validation.ts` already accepts them, but the controller regex rejects them); (2) fix the frontend error parsing in `MarketplacePage.tsx:116-118` to read `data.message` instead of `data.error` (the backend returns `{ status, statusCode, message }` but the frontend checks `data.error` which is always undefined).

**Tech Stack:** TypeScript, Express, React

---

### Task 1: Fix URL regex in scrapeController

**Files:**
- Modify: `backend/src/controllers/scrapeController.ts:461-463`

**Step 1: Fix the regex**

The current regex:
```typescript
private isValidMarketplaceUrl(url: string): boolean {
  return /^https:\/\/(www\.)?(facebook|linkedin)\.com\/marketplace\/[\w-]+/.test(url.trim());
}
```

Only matches `www.` or no subdomain. Change to:

```typescript
private isValidMarketplaceUrl(url: string): boolean {
  return /^https?:\/\/(www\.|web\.|m\.)?(facebook|linkedin)\.com\/marketplace\/[\w-]+/.test(url.trim());
}
```

Changes: `(www\.)?` → `(www\.|web\.|m\.)?` and `https:` → `https?:` (some FB links use http redirect).

**Step 2: Verify backend compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add backend/src/controllers/scrapeController.ts
git commit -m "fix: accept web.facebook.com and m.facebook.com marketplace URLs"
```

---

### Task 2: Fix frontend error message parsing

**Files:**
- Modify: `src/pages/MarketplacePage.tsx:109-118`

**Step 1: Fix the error extraction**

The backend sends `{ status: 'error', statusCode: N, message: '...' }` (see `errorHandler.ts:32-36`).
The frontend checks `error.response.data.error` which is always `undefined`.

Current code (lines 109-118):
```typescript
} catch (error: any) {
  let errorMessage = 'Une erreur est survenue';
  if (error.response?.status === 409) {
    errorMessage = 'Une extraction est déjà en cours. Veuillez attendre.';
  } else if (error.response?.status === 402) {
    errorMessage = 'Crédits insuffisants.';
    setShowInsufficientModal(true);
  } else if (error.response?.data?.error) {
    errorMessage = error.response.data.error;
  }
```

Fix to:
```typescript
} catch (error: any) {
  let errorMessage = error.response?.data?.message || 'Une erreur est survenue';
  if (error.response?.status === 409) {
    errorMessage = 'Une extraction est déjà en cours. Veuillez attendre.';
  } else if (error.response?.status === 402) {
    errorMessage = error.response?.data?.message || 'Crédits insuffisants.';
    setShowInsufficientModal(true);
  }
```

Changes:
- Default `errorMessage` reads `data.message` (the real backend error) instead of hardcoded string
- Removed dead `else if (data.error)` branch — backend never sends `.error`
- 402 also shows backend message if available (e.g. "Crédits insuffisants. Requis: 5, disponible: 2")

**Step 2: Verify frontend compiles**

Run: `cd <project-root> && npx vite build`
Expected: build succeeds

**Step 3: Commit**

```bash
git add src/pages/MarketplacePage.tsx
git commit -m "fix: show real backend error messages in marketplace instead of generic text"
```

---

### Task 3: Build + verify

**Step 1:** `cd backend && npx tsc --noEmit`
**Step 2:** `cd <project-root> && npx vite build`
**Step 3:** `bash build-O2Switch.sh`
**Step 4:** Final commit + push
