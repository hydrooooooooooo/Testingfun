# Mentions Module — Fix Plan (Updated)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Corriger tous les bugs et incohérences du module Mentions/Surveillance pour le rendre production-ready, avec déduction de crédits obligatoire pour toute utilisation de l'IA.

**Architecture:** Le module repose sur 3 tables (`brand_keywords`, `brand_mentions`, `mention_alerts`), `mentionDetectionService` (détection + AI), `mentionAlertService` (emails), `mentionController` (17 endpoints), et `scheduledScrapeService` (automations). Le frontend a MentionsPage + AddKeywordModal + useUnreadAlerts.

**Tech Stack:** Express + Knex + PostgreSQL (backend), React + shadcn/ui + TailwindCSS (frontend)

**Constraint:** Toute opération utilisant l'IA (analyse de mentions) DOIT déduire des crédits. Coûts définis dans COST_MATRIX: 0.05 cr/mention + 0.1 cr/keyword.

---

## Task 1 : Migration — Ajouter colonnes manquantes à `brand_mentions`

**Files:**
- Create: `backend/src/database/migrations/20260225000004_add_page_name_post_type_to_brand_mentions.ts`
- Create: `backend/migrations/20260225_add_page_name_post_type.sql`

**Contexte:** `mentionDetectionService.ts:91-92` insère `page_name` et `post_type`, mais ces colonnes n'existent pas dans la migration originale. INSERT échoue en production.

**Step 1:** Create Knex migration:
```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasPageName = await knex.schema.hasColumn('brand_mentions', 'page_name');
  if (!hasPageName) {
    await knex.schema.alterTable('brand_mentions', (table) => {
      table.string('page_name').nullable();
      table.string('post_type').nullable().defaultTo('post');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('brand_mentions', (table) => {
    table.dropColumn('page_name');
    table.dropColumn('post_type');
  });
}
```

**Step 2:** Create SQL production:
```sql
BEGIN;
ALTER TABLE brand_mentions ADD COLUMN IF NOT EXISTS page_name VARCHAR(255);
ALTER TABLE brand_mentions ADD COLUMN IF NOT EXISTS post_type VARCHAR(50) DEFAULT 'post';
COMMIT;
```

**Step 3:** Verify: `cd backend && npx tsc --noEmit`

---

## Task 2 : Migration — Retirer FK `comment_id` orpheline

**Files:**
- Create: `backend/src/database/migrations/20260225000005_drop_comment_id_fk_brand_mentions.ts`
- Create: `backend/migrations/20260225_drop_comment_id_fk.sql`

**Contexte:** `brand_mentions.comment_id` a un FK vers `facebook_comments(id)` — table inexistante. On retire le FK, on garde la colonne.

**Step 1:** Create Knex migration:
```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('brand_mentions', 'comment_id');
  if (hasColumn) {
    await knex.schema.alterTable('brand_mentions', (table) => {
      try { table.dropForeign(['comment_id']); } catch {}
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // No-op: don't recreate broken FK
}
```

**Step 2:** Create SQL production:
```sql
ALTER TABLE brand_mentions DROP CONSTRAINT IF EXISTS brand_mentions_comment_id_foreign;
```

**Step 3:** Verify: `cd backend && npx tsc --noEmit`

---

## Task 3 : Ajouter `mention_analysis` au ServiceType + déduction crédits OBLIGATOIRE

**Files:**
- Modify: `backend/src/services/creditService.ts:29-36` — ajouter type
- Modify: `backend/src/controllers/mentionController.ts:11-61` — ajouter réservation + déduction crédits
- Modify: `backend/src/services/mentionDetectionService.ts:79` — fix brand_keywords storage

**Contexte:** L'analyse de mentions utilise l'IA (OpenRouter GPT-4o-mini) mais ne déduit AUCUN crédit. Le ServiceType enum ne contient pas de type mentions. Le `brand_keywords` est stocké en JSON.stringify au lieu d'un array natif.

**Step 1:** Ajouter `'mention_analysis'` au ServiceType dans `creditService.ts`:
```typescript
export type ServiceType =
  | 'facebook_posts'
  | 'facebook_pages'
  | 'facebook_pages_benchmark'
  | 'facebook_pages_calendar'
  | 'facebook_pages_copywriting'
  | 'ai_analysis'
  | 'mention_analysis'    // ← NEW
  | 'marketplace';
```

**Step 2:** Modifier `analyzeMentions` dans `mentionController.ts` pour vérifier les crédits AVANT l'analyse et déduire APRÈS:
```typescript
export const analyzeMentions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { sessionId } = req.params;

  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    // 1. Récupérer les mots-clés
    const keywords = await mentionDetectionService.getUserKeywords(req.user.id);
    if (keywords.length === 0) {
      return res.status(400).json({
        message: 'Aucun mot-clé configuré. Veuillez d\'abord configurer vos mots-clés de surveillance.'
      });
    }

    // 2. Vérifier que l'utilisateur a des crédits (estimation minimum)
    const minCost = COST_MATRIX.mentions.perKeyword * keywords.length;
    const hasEnough = await creditService.hasEnoughCredits(req.user.id, minCost);
    if (!hasEnough) {
      return res.status(402).json({
        message: 'Crédits insuffisants pour l\'analyse de mentions',
        required: minCost,
      });
    }

    // 3. Analyser les mentions (utilise l'IA)
    const mentions = await mentionDetectionService.detectMentionsInSession(
      sessionId,
      req.user.id,
      keywords
    );

    // 4. Calculer le coût réel et déduire les crédits
    const cost = calculateMentionsCost(mentions.length) + (COST_MATRIX.mentions.perKeyword * keywords.length);
    if (cost > 0) {
      await creditService.deductCredits(
        req.user.id,
        cost,
        'mention_analysis',
        sessionId,
        `Analyse mentions: ${mentions.length} mentions détectées, ${keywords.length} mots-clés`
      );
    }

    // 5. Envoyer des alertes pour les mentions urgentes (respecter préférence email)
    const urgentMentions = mentions.filter(m => m.priority_level === 'urgent');
    for (const mention of urgentMentions) {
      try {
        const mentionKeywords = mention.brand_keywords || [];
        const keywordsWithEmail = await db('brand_keywords')
          .where({ user_id: req.user.id, is_active: true, email_alerts: true })
          .whereIn('keyword', Array.isArray(mentionKeywords) ? mentionKeywords : []);

        if (keywordsWithEmail.length > 0) {
          await mentionAlertService.sendAlert(mention, req.user, 'email');
        }
      } catch (alertError: any) {
        logger.warn('[MENTIONS] Failed to send alert:', alertError.message);
      }
    }

    logger.info(`[MENTIONS] Analysis complete: ${mentions.length} mentions, cost: ${cost} credits`);

    return res.status(200).json({
      success: true,
      mentionsFound: mentions.length,
      urgentMentions: urgentMentions.length,
      creditsUsed: cost,
      mentions,
    });
  } catch (error: any) {
    if (error.message?.includes('Insufficient credits')) {
      return res.status(402).json({ message: 'Crédits insuffisants' });
    }
    logger.error('[MENTIONS] Error analyzing mentions:', error);
    next(error);
  }
};
```

**Step 3:** Fix `brand_keywords` storage in `mentionDetectionService.ts:79`:
```typescript
// BEFORE:
brand_keywords: JSON.stringify(analysis.detectedKeywords),

// AFTER:
brand_keywords: analysis.detectedKeywords,
```

**Step 4:** Ajouter les imports manquants en haut de `mentionController.ts`:
```typescript
import { creditService } from '../services/creditService';
import { COST_MATRIX, calculateMentionsCost } from '../services/costEstimationService';
```

**Step 5:** Verify: `cd backend && npx tsc --noEmit`

---

## Task 4 : Fix `runMentionDetection()` — Appeler le vrai service + déduire crédits

**Files:**
- Modify: `backend/src/services/scheduledScrapeService.ts:438-464`

**Contexte:** `runMentionDetection()` calcule un coût et déduit des crédits mais n'appelle JAMAIS `mentionDetectionService.detectMentionsInSession()`. L'automatisation est un no-op payant.

**Step 1:** Ajouter l'import en haut du fichier (si pas déjà présent):
```typescript
import mentionDetectionService from './mentionDetectionService';
```

**Step 2:** Remplacer le body de `runMentionDetection()` (lignes 438-464):
```typescript
private async runMentionDetection(sessionId: string, userId: number): Promise<number> {
  try {
    // 1. Récupérer les mots-clés actifs de l'utilisateur
    const keywords = await mentionDetectionService.getUserKeywords(userId);
    if (!keywords || keywords.length === 0) {
      logger.warn('[AUTOMATION] No keywords configured, skipping mention detection');
      return 0;
    }

    // 2. Exécuter la détection de mentions (appel IA réel)
    const mentions = await mentionDetectionService.detectMentionsInSession(
      sessionId, userId, keywords
    );

    // 3. Calculer le coût réel basé sur les résultats
    const cost = calculateMentionsCost(mentions.length) + (COST_MATRIX.mentions.perKeyword * keywords.length);

    // 4. Déduire les crédits uniquement si coût > 0
    if (cost > 0) {
      await creditService.deductCredits(
        userId, cost, 'mention_analysis' as any, sessionId,
        `Détection mentions automatisée: ${mentions.length} mentions, ${keywords.length} mots-clés`
      );
    }

    logger.info(`[AUTOMATION] Mention detection: ${mentions.length} mentions found, cost: ${cost} credits`);
    return cost;
  } catch (error) {
    logger.error('[AUTOMATION] Failed to run mention detection:', error);
    return 0;
  }
}
```

**Step 3:** Verify: `cd backend && npx tsc --noEmit`

---

## Task 5 : Fix route Settings + ownership check session

**Files:**
- Modify: `src/pages/MentionsPage.tsx:464` — fix route
- Modify: `backend/src/controllers/mentionController.ts` — ajouter ownership check dans analyzeMentions

**Step 1:** Fix route Settings (ligne 464):
```typescript
// BEFORE:
onClick={() => navigate('/dashboard/mentions/settings')}

// AFTER:
onClick={() => navigate('/dashboard/mention-settings')}
```

**Step 2:** Ajouter validation du format sessionId dans `analyzeMentions` (après le check keywords, avant l'analyse):
```typescript
// Valider le format du sessionId
if (!sessionId || !/^sess_[A-Za-z0-9_-]+$/.test(sessionId)) {
  return res.status(400).json({ message: 'Format de session invalide' });
}
```

**Step 3:** Verify frontend builds: `npx vite build`

---

## Task 6 : Déduplication des mentions

**Files:**
- Modify: `backend/src/services/mentionDetectionService.ts:96-99`

**Contexte:** Analyser la même session 2 fois crée des doublons. Ajouter un guard avant INSERT.

**Step 1:** Ajouter un check de déduplication avant l'INSERT (avant ligne 97):
```typescript
// Check pour éviter les doublons
const existingMention = await db('brand_mentions')
  .where({
    user_id: userId,
    session_id: sessionId,
    comment_text: mentionData.comment_text,
  })
  .first();

if (existingMention) {
  logger.info(`[MENTIONS] Skipping duplicate mention for "${mentionData.comment_text.substring(0, 50)}..."`);
  continue;
}
```

**Step 2:** Transformer le `const` en structure try/continue:
Le code existant fait `const [savedMention] = await db('brand_mentions').insert(...)`. Il faut que le `continue` fonctionne dans la boucle for.

**Step 3:** Verify: `cd backend && npx tsc --noEmit`

---

## Task 7 : Cleanup MentionsPage — Dead code + JSON.parse safety

**Files:**
- Modify: `src/pages/MentionsPage.tsx`

**Step 1:** Supprimer 4 fonctions dead code:
- `getMentionIcon()` (lignes 268-279)
- `getPriorityColor()` (lignes 281-292)
- `getTypeLabel()` (lignes 294-305)
- `formatLastMention()` (lignes 240-247)

**Step 2:** Ajouter try-catch sur JSON.parse (lignes 873-878):
```typescript
let keywordsArray: string[] = [];
try {
  keywordsArray = Array.isArray(mention.brand_keywords)
    ? mention.brand_keywords
    : (typeof mention.brand_keywords === 'string'
      ? JSON.parse(mention.brand_keywords || '[]')
      : []);
} catch {
  keywordsArray = [];
}
```

Même fix pour le bloc dans `handleExportCSV` (ligne 366-368).

**Step 3:** Supprimer import inutilisé `MessageSquare` si plus utilisé nulle part.

**Step 4:** Verify: `npx vite build`

---

## Task 8 : Afficher sentiment score + response time dans les mention cards

**Files:**
- Modify: `src/pages/MentionsPage.tsx` — dans le rendu des mention cards (~ligne 960, après le badge type)

**Step 1:** Ajouter après le badge type (après ligne 966):
```tsx
{/* Sentiment score */}
{mention.sentiment_score != null && (
  <Badge className={`text-xs ${
    mention.sentiment_score >= 60 ? 'bg-green-100 text-green-700 border-green-200'
    : mention.sentiment_score >= 40 ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
    : 'bg-red-100 text-red-700 border-red-200'
  }`}>
    {mention.sentiment_score >= 60 ? 'Positif' : mention.sentiment_score >= 40 ? 'Neutre' : 'Negatif'}{' '}
    {mention.sentiment_score}%
  </Badge>
)}

{/* Temps de réponse suggéré */}
{mention.suggested_response_time && mention.status === 'new' && (
  <span className="text-xs text-steel flex items-center gap-1">
    Reponse suggeree: {mention.suggested_response_time < 60
      ? `${mention.suggested_response_time}min`
      : `${Math.round(mention.suggested_response_time / 60)}h`}
  </span>
)}
```

**Step 2:** Verify: `npx vite build`

---

## Task 9 : Afficher coût crédits dans le frontend avant analyse

**Files:**
- Modify: `src/pages/MentionsPage.tsx` — dans la section "Analyser" (onglet analyze, bouton Analyser des sessions)

**Contexte:** L'utilisateur doit voir combien de crédits l'analyse va coûter AVANT de cliquer. Ajouter une indication du coût estimé.

**Step 1:** Dans la fonction `handleAnalyze`, ajouter un toast de confirmation avec le coût estimé. Modifier le handler pour afficher les crédits déduits dans le toast de succès:
```typescript
// Le backend retourne maintenant creditsUsed dans la réponse
toast({
  title: 'Analyse terminée',
  description: `${data.mentionsFound} mention(s) détectée(s) — ${data.creditsUsed?.toFixed(2) || 0} crédit(s) utilisé(s)`,
});
```

**Step 2:** Ajouter un texte d'information sous chaque bouton "Analyser":
```tsx
<span className="text-xs text-steel mt-1">
  Coût: ~{(keywords.length * 0.1).toFixed(1)} cr + 0.05 cr/mention
</span>
```

**Step 3:** Verify: `npx vite build`

---

## Task 10 : Build, commit, push

**Step 1:** Backend compile: `cd backend && npx tsc --noEmit`
**Step 2:** Frontend build: `npx vite build`
**Step 3:** Commit all changes
**Step 4:** Push to remote
