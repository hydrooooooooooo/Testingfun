# Mentions System — Bug Fixes & CRON Activation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 6 critical bugs in the mentions/keyword monitoring system so that both manual "Analyser" and automatic CRON surveillance work end-to-end.

**Architecture:** The mentions system scans posts AND comments correctly, but has wiring bugs: `linkedAutomationId` is never persisted, CRON keywords don't activate mention detection on their linked automation, session listing leaks across users, and the settings page destroys CRON keywords. Each task is an independent fix.

**Tech Stack:** TypeScript, Express, Knex, PostgreSQL (SQLite dev), React

---

### Task 1: Save `linkedAutomationId` when adding a CRON keyword

The frontend sends `linkedAutomationId` but neither the controller nor the service persists it to the `brand_keywords` table.

**Files:**
- Modify: `backend/src/controllers/mentionController.ts:266-299`
- Modify: `backend/src/services/mentionDetectionService.ts:499-524`

**Step 1: Fix the controller to pass `linkedAutomationId`**

In `backend/src/controllers/mentionController.ts`, the `addKeyword` handler (line ~282) calls:
```typescript
mentionDetectionService.addKeyword(userId, { keyword, category, monitoredPages, frequency, emailAlerts })
```

Change to:
```typescript
const { keyword, category, monitoredPages, frequency, emailAlerts, linkedAutomationId } = req.body;
// ... (existing validation) ...
const result = await mentionDetectionService.addKeyword(userId, {
  keyword, category, monitoredPages, frequency, emailAlerts, linkedAutomationId
});
```

**Step 2: Fix the service to insert `linked_automation_id`**

In `backend/src/services/mentionDetectionService.ts`, the `addKeyword` method (line ~509) inserts into `brand_keywords`. Add `linkedAutomationId` to the function signature and to the insert:

Current signature (~line 499):
```typescript
async addKeyword(userId: number, keywordData: {
  keyword: string; category?: string; monitoredPages?: string[];
  frequency?: string; emailAlerts?: boolean;
}): Promise<any>
```

Change to:
```typescript
async addKeyword(userId: number, keywordData: {
  keyword: string; category?: string; monitoredPages?: string[];
  frequency?: string; emailAlerts?: boolean; linkedAutomationId?: string;
}): Promise<any>
```

In the DB insert object (~line 509-520), add:
```typescript
linked_automation_id: keywordData.linkedAutomationId || null,
```

**Step 3: Verify compilation**

Run: `cd backend && npx tsc --noEmit`

**Step 4: Commit**

```bash
git add backend/src/controllers/mentionController.ts backend/src/services/mentionDetectionService.ts
git commit -m "fix: persist linkedAutomationId when adding CRON keyword"
```

---

### Task 2: Auto-activate `mentionDetection` on linked automation

When a CRON keyword is linked to an automation, the automation's `config.mentionDetection` must be set to `true` so that `scheduledScrapeService` actually runs mention detection during automated scrapes.

**Files:**
- Modify: `backend/src/services/mentionDetectionService.ts:499-524`

**Step 1: After inserting the keyword, update the automation config**

At the end of the `addKeyword` method, after the DB insert and before the return, add:

```typescript
// Auto-activate mentionDetection on linked automation
if (keywordData.linkedAutomationId && keywordData.frequency === 'cron') {
  try {
    const automation = await db('scheduled_scrapes')
      .where({ id: keywordData.linkedAutomationId, user_id: userId })
      .first();
    if (automation) {
      const config = typeof automation.config === 'string'
        ? JSON.parse(automation.config)
        : (automation.config || {});
      if (!config.mentionDetection) {
        config.mentionDetection = true;
        await db('scheduled_scrapes')
          .where({ id: automation.id })
          .update({ config: JSON.stringify(config) });
        logger.info(`Auto-activated mentionDetection on automation ${automation.id} for user ${userId}`);
      }
    }
  } catch (err) {
    logger.warn(`Failed to auto-activate mentionDetection on automation: ${err}`);
  }
}
```

**Step 2: Verify compilation**

Run: `cd backend && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add backend/src/services/mentionDetectionService.ts
git commit -m "fix: auto-activate mentionDetection on linked automation"
```

---

### Task 3: Filter `getUserFacebookPagesSessions` by user ownership

Currently the file-system scan returns ALL backup files. It must check session ownership via the DB.

**Files:**
- Modify: `backend/src/services/mentionDetectionService.ts:594-644`

**Step 1: Add user filtering**

In `getUserFacebookPagesSessions`, after collecting file names from the backup directory, query the `scraping_sessions` table to get only sessions owned by `userId`:

```typescript
async getUserFacebookPagesSessions(userId: number): Promise<any[]> {
  // Get sessions owned by user from DB
  const userSessions = await db('scraping_sessions')
    .where({ user_id: userId, service_type: 'facebook_pages' })
    .select('session_id')
    .orderBy('created_at', 'desc')
    .limit(20);
  const userSessionIds = new Set(userSessions.map((s: any) => s.session_id));

  // Read backup files, but only for user's sessions
  const backupDir = path.join(__dirname, '../../data/backups');
  // ... existing file scanning code ...
  // Add filter: if (!userSessionIds.has(sessionId)) continue;
```

At the top of the file-scanning loop (after extracting `sessionId` from the filename like `fbpages_sess_XXX.json`), add:

```typescript
const sessionId = file.replace('fbpages_', '').replace('.json', '');
if (!userSessionIds.has(sessionId)) continue;
```

**Step 2: Verify compilation**

Run: `cd backend && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add backend/src/services/mentionDetectionService.ts
git commit -m "fix: filter mention sessions by user ownership"
```

---

### Task 4: Fix `getMentionStats` for SQLite compatibility

The `FILTER (WHERE ...)` syntax is PostgreSQL-only. Replace with `CASE WHEN`.

**Files:**
- Modify: `backend/src/services/mentionDetectionService.ts:422-467`

**Step 1: Replace the FILTER syntax**

Find the stats query (~line 430-450). Replace any:
```sql
COUNT(*) FILTER (WHERE mention_type = 'recommendation')
```

With:
```sql
SUM(CASE WHEN mention_type = 'recommendation' THEN 1 ELSE 0 END)
```

Apply this to all FILTER clauses in the query. The typical pattern:

```typescript
const stats = await db('brand_mentions')
  .where({ user_id: userId })
  .select(
    db.raw('COUNT(*) as total'),
    db.raw("SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new"),
    db.raw("SUM(CASE WHEN mention_type = 'recommendation' THEN 1 ELSE 0 END) as recommendations"),
    db.raw("SUM(CASE WHEN mention_type = 'question' THEN 1 ELSE 0 END) as questions"),
    db.raw("SUM(CASE WHEN mention_type = 'complaint' THEN 1 ELSE 0 END) as complaints"),
    db.raw('AVG(sentiment_score) as avg_sentiment')
  )
  .first();
```

**Step 2: Verify compilation**

Run: `cd backend && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add backend/src/services/mentionDetectionService.ts
git commit -m "fix: mention stats — replace PostgreSQL FILTER with CASE WHEN for SQLite compat"
```

---

### Task 5: Protect CRON keywords from MentionSettingsPage destruction

The old `MentionSettingsPage` calls `setUserKeywords()` which deactivates ALL keywords then re-creates only the simple ones, destroying CRON keywords in the process.

**Files:**
- Modify: `backend/src/services/mentionDetectionService.ts` — find `setUserKeywords` method

**Step 1: Preserve CRON keywords in `setUserKeywords`**

In the `setUserKeywords` method, change the "deactivate all" query to only deactivate `manual` frequency keywords:

```typescript
// Only deactivate manual keywords, preserve CRON keywords
await db('brand_keywords')
  .where({ user_id: userId })
  .where(function() {
    this.where('frequency', 'manual').orWhereNull('frequency');
  })
  .update({ is_active: false });
```

**Step 2: Verify compilation**

Run: `cd backend && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add backend/src/services/mentionDetectionService.ts
git commit -m "fix: setUserKeywords preserves CRON keywords"
```

---

### Task 6: Add `post_type` field to mention detection for post matches

When a keyword matches in a **post** (not a comment), the `post_type` field should be set to `'post'` to distinguish from comment matches.

**Files:**
- Modify: `backend/src/services/mentionDetectionService.ts:22-133`

**Step 1: In `detectMentionsInSession`, set `post_type` on post matches**

In the section that iterates over `matchingPosts` (~line 50-58), when creating the mention data to save, ensure:

```typescript
post_type: 'post',
comment_text: post.text || post.message || '',
comment_author: post.pageName || '',
```

And for comment matches:

```typescript
post_type: 'comment',
comment_text: comment.text || comment.message || '',
comment_author: comment.author || comment.author_name || '',
```

This ensures the frontend can distinguish post mentions from comment mentions.

**Step 2: Verify compilation**

Run: `cd backend && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add backend/src/services/mentionDetectionService.ts
git commit -m "fix: set post_type field to distinguish post vs comment mentions"
```

---

### Task 7: Build + verify

**Step 1:** `cd backend && npx tsc --noEmit`
**Step 2:** `cd <project-root> && npx vite build`
**Step 3:** `bash build-O2Switch.sh`
**Step 4:** Final commit + push
