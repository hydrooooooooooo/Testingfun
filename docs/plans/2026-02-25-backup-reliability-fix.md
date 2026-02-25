# Backup Reliability Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Guarantee ALL scraped datasets (Facebook Pages, Marketplace, Benchmarks, Automations) are saved to `data/backups/` with full raw data, and never destroyed by deployments.

**Architecture:** Centralize backup logic into a single `backupService`, fix all callers, protect backups from `rsync --delete`, and ensure raw Apify data is preserved for client support.

**Tech Stack:** Node.js, fs, path, Express, TypeScript

---

## Bugs Found

| # | Severity | Description |
|---|----------|-------------|
| 1 | **CRITICAL** | `rsync --delete` in deploy wipes `data/backups/` every deployment |
| 2 | **HIGH** | Marketplace uses `process.cwd()` (fragile), FB Pages uses `__dirname` (stable) |
| 3 | **HIGH** | Marketplace backup drops raw Apify fields — only saves 7 normalized fields + max 3 images |
| 4 | **HIGH** | `scheduledScrapeService` (automations) never creates backup files |
| 5 | **MEDIUM** | No centralized backup service — 3 different implementations with different behaviors |

---

### Task 1: Protect backups from rsync --delete

**Files:**
- Modify: `build-O2Switch.sh:41-44`

**Step 1: Add data/backups placeholder to deploy package**

After `mkdir -p "$BACKEND_DEPLOY"` (line 43), add:

```bash
# Créer le dossier data/backups pour qu'il ne soit pas supprimé par rsync --delete
mkdir -p "$BACKEND_DEPLOY/data/backups"
touch "$BACKEND_DEPLOY/data/backups/.gitkeep"
```

**Step 2: Update rsync command in GUIDE-DEPLOIEMENT.txt**

Change the backend rsync command to **exclude** the data directory from deletion:

```bash
rsync -avz --delete --exclude='data/' BACKEND-backend_scrapy/ \
  wogo4385@votre-serveur.o2switch.net:/home/wogo4385/backend_scrapy/
```

**Step 3: Commit**

```bash
git add build-O2Switch.sh
git commit -m "fix: protect data/backups from rsync --delete on deploy"
```

---

### Task 2: Create centralized backupService

**Files:**
- Create: `backend/src/services/backupService.ts`

**Step 1: Implement backupService**

```typescript
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

const BACKUP_DIR = path.join(__dirname, '../../data/backups');

function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Save a Facebook Pages session backup (full sub-sessions with all raw data).
 */
export function saveFacebookPagesBackup(sessionId: string, subSessions: any[]): void {
  try {
    ensureBackupDir();
    const filePath = path.join(BACKUP_DIR, `fbpages_${sessionId}.json`);
    const data = {
      sessionId,
      timestamp: new Date().toISOString(),
      totalPages: subSessions.length,
      subSessions,
    };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    logger.info(`[BACKUP] Facebook Pages saved: fbpages_${sessionId}.json`);
  } catch (error) {
    logger.error(`[BACKUP] Failed to save Facebook Pages backup for ${sessionId}:`, error);
  }
}

/**
 * Save a Marketplace session backup (full raw items from Apify).
 */
export function saveMarketplaceBackup(
  sessionId: string,
  datasetId: string,
  rawItems: any[]
): void {
  try {
    ensureBackupDir();
    const filePath = path.join(BACKUP_DIR, `${sessionId}.json`);

    // Don't overwrite existing backup (polling + webhook race guard)
    if (fs.existsSync(filePath)) {
      logger.info(`[BACKUP] Marketplace backup already exists for ${sessionId}, skipping`);
      return;
    }

    const data = {
      sessionId,
      datasetId,
      timestamp: new Date().toISOString(),
      totalItems: rawItems.length,
      items: rawItems,
    };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    logger.info(`[BACKUP] Marketplace saved: ${sessionId}.json (${rawItems.length} items)`);
  } catch (error) {
    logger.error(`[BACKUP] Failed to save Marketplace backup for ${sessionId}:`, error);
  }
}

/**
 * Read a backup file by session ID and type.
 */
export function readBackup(sessionId: string, type: 'fbpages' | 'marketplace'): any | null {
  try {
    if (!/^sess_[A-Za-z0-9_-]+$/.test(sessionId)) return null;
    const prefix = type === 'fbpages' ? 'fbpages_' : '';
    const filePath = path.join(BACKUP_DIR, `${prefix}${sessionId}.json`);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}
```

**Step 2: Commit**

```bash
git add backend/src/services/backupService.ts
git commit -m "feat: add centralized backupService for reliable backup storage"
```

---

### Task 3: Migrate scrapeController to use backupService + save raw data

**Files:**
- Modify: `backend/src/controllers/scrapeController.ts`

**Step 1: Replace createBackupFile with backupService call**

Replace the import section to add:
```typescript
import { saveMarketplaceBackup } from '../services/backupService';
```

In `getScrapeResult` (polling path), around line 237-248, change to save **raw items** from Apify before normalization. The key change is: we need the raw dataset items alongside the normalized ones.

Currently at line 237:
```typescript
const normalizedItems = await apifyService.getDatasetItems(session.datasetId);
```

After this, add a call to save the raw normalized items (which already contain all Apify fields after extraction):
```typescript
// Save full backup with all item data
saveMarketplaceBackup(sessionId, session.datasetId, normalizedItems);
```

Replace line 248 (`this.createBackupFile(...)`) with the line above.

In `handleApifyWebhook` (webhook path), around line 393, replace:
```typescript
this.createBackupFile(sessionId, datasetId, totalItemsCount, previewItems, allItems);
```
with:
```typescript
saveMarketplaceBackup(sessionId, datasetId, allItems);
```

**Step 2: Delete the private `createBackupFile` method** (lines 462-518) — no longer needed.

**Step 3: Remove unused `fs` and `path` imports** if no longer used elsewhere in the file.

**Step 4: Commit**

```bash
git add backend/src/controllers/scrapeController.ts
git commit -m "fix: marketplace backups now save full raw data via backupService"
```

---

### Task 4: Migrate facebookPagesService/Controller to use backupService

**Files:**
- Modify: `backend/src/controllers/facebookPagesController.ts:254`
- Modify: `backend/src/services/facebookPagesService.ts`

**Step 1: Replace saveBackup call in controller**

In `facebookPagesController.ts` line 254, replace:
```typescript
facebookPagesService.saveBackup(sessionId, subSessions);
```
with:
```typescript
import { saveFacebookPagesBackup } from '../services/backupService';
// ...
saveFacebookPagesBackup(sessionId, subSessions);
```

**Step 2: Update readBackup references in facebookPagesService.ts**

Keep `readBackup` method in `facebookPagesService.ts` but make it delegate to `backupService.readBackup`:

```typescript
import { readBackup as readBackupFile } from './backupService';

readBackup(sessionId: string): any | null {
  return readBackupFile(sessionId, 'fbpages');
}
```

Remove the `saveBackup` method from `facebookPagesService.ts` (lines 122-139).

**Step 3: Remove unused `fs` import** from `facebookPagesService.ts` if `readBackup` now delegates.

**Step 4: Commit**

```bash
git add backend/src/controllers/facebookPagesController.ts backend/src/services/facebookPagesService.ts
git commit -m "refactor: FB Pages backups use centralized backupService"
```

---

### Task 5: Add backup calls to scheduledScrapeService (automations)

**Files:**
- Modify: `backend/src/services/scheduledScrapeService.ts`

**Step 1: Find the marketplace and facebook_pages execution code paths**

Search for where `sessionService.updateSession(sessionId, { status: SessionStatus.FINISHED })` is called after scraping completes. Add backup calls just before session finalization.

For marketplace automations — after fetching dataset items and before marking FINISHED:
```typescript
import { saveMarketplaceBackup, saveFacebookPagesBackup } from './backupService';

// After: const items = await apifyService.getDatasetItems(datasetId);
saveMarketplaceBackup(sessionId, datasetId, items);
```

For facebook_pages automations — after collecting sub-sessions data:
```typescript
// After sub-sessions data is fetched
saveFacebookPagesBackup(sessionId, subSessions);
```

**Step 2: Commit**

```bash
git add backend/src/services/scheduledScrapeService.ts
git commit -m "fix: automations now create backup files for all scrape types"
```

---

### Task 6: Verify backend compilation + build O2Switch

**Step 1: Compile backend**

```bash
cd backend && npx tsc --project tsconfig.production.json
```

Expected: No errors.

**Step 2: Build frontend** (unchanged but verify)

```bash
cd .. && npx vite build
```

**Step 3: Run build-O2Switch.sh**

```bash
bash build-O2Switch.sh
```

Verify `DEPLOY-O2SWITCH/BACKEND-backend_scrapy/data/backups/.gitkeep` exists.

**Step 4: Commit all and push**

```bash
git add -A
git commit -m "fix: backup reliability — centralized service, deploy protection, automation backups"
git push
```
