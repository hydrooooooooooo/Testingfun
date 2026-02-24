# Benchmark Concurrentiel — Améliorations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Corriger les bugs critiques du Benchmark et améliorer l'UX (historique, PDF, période d'analyse, noms de pages).

**Architecture:** Corrections backend (migration DB, endpoint history enrichi) + frontend (PDF complet fidèle à l'UI, historique avec noms de pages, UX période d'analyse simplifiée).

**Tech Stack:** Express + Knex + PostgreSQL (backend), React + Recharts + jsPDF-like HTML print (frontend)

---

## Résumé des problèmes identifiés

| # | Problème | Sévérité | Fichiers |
|---|----------|----------|----------|
| 1 | Historique : pas de noms de pages, juste un compteur | UX critique | Controller + Frontend |
| 2 | PDF incomplet : ne reprend pas Graphiques, Analyse Qualitative, Comparatif, Recommandations | UX critique | BenchmarkPage.tsx:461-823 |
| 3 | "Période d'analyse" confuse : "Dernier mois" = mois précédent, pas les 30 derniers jours | UX | BenchmarkPage.tsx:236-270, 985-1010 |
| 4 | Migration DB : `credits_cost` référencé mais jamais créé en colonne | Bug backend | Migration + Controller:486 |
| 5 | Pas de `my_page_url` stocké en DB → impossible de savoir "ma page" dans l'historique | Data gap | Migration + Controller |
| 6 | Échec silencieux des concurrents : pas de feedback utilisateur | UX | benchmarkService.ts:194-197 |

---

## Task 1 : Migration DB — ajouter colonnes manquantes

**Files:**
- Create: `backend/src/database/migrations/20260225000002_fix_benchmark_analyses_columns.ts`

**Step 1: Créer la migration**

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Vérifier si la table existe d'abord
  const tableExists = await knex.schema.hasTable('benchmark_analyses');
  if (!tableExists) return;

  const hasCreditsCost = await knex.schema.hasColumn('benchmark_analyses', 'credits_cost');
  const hasMyPageUrl = await knex.schema.hasColumn('benchmark_analyses', 'my_page_url');
  const hasMyPageName = await knex.schema.hasColumn('benchmark_analyses', 'my_page_name');
  const hasCompetitorNames = await knex.schema.hasColumn('benchmark_analyses', 'competitor_names');

  await knex.schema.alterTable('benchmark_analyses', (table) => {
    if (!hasCreditsCost) table.decimal('credits_cost', 10, 2).nullable();
    if (!hasMyPageUrl) table.string('my_page_url', 500).nullable();
    if (!hasMyPageName) table.string('my_page_name', 200).nullable();
    if (!hasCompetitorNames) table.jsonb('competitor_names').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  const tableExists = await knex.schema.hasTable('benchmark_analyses');
  if (!tableExists) return;

  await knex.schema.alterTable('benchmark_analyses', (table) => {
    table.dropColumns('credits_cost', 'my_page_url', 'my_page_name', 'competitor_names');
  });
}
```

**Step 2: Vérifier compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add backend/src/database/migrations/20260225000002_fix_benchmark_analyses_columns.ts
git commit -m "fix: add missing benchmark_analyses columns (credits_cost, page names)"
```

---

## Task 2 : Backend — Sauvegarder les noms de pages + enrichir l'historique

**Files:**
- Modify: `backend/src/controllers/benchmarkController.ts` (runFullBenchmark + getBenchmarkHistory + analyzeBenchmark)

**Step 1: Mettre à jour `runFullBenchmark` pour sauvegarder les noms**

Dans la méthode qui sauvegarde en DB après le benchmark, ajouter :
- `my_page_url` : l'URL de la page de référence
- `my_page_name` : le nom extrait (via `extractPageName()`)
- `competitor_names` : JSON array des noms extraits des URLs concurrentes
- `credits_cost` : le coût réel en crédits

**Step 2: Mettre à jour `getBenchmarkHistory` pour retourner les nouveaux champs**

Modifier le select de l'endpoint `/benchmark/history` :

```typescript
// Avant (ligne ~486)
.select('id', 'created_at', 'competitors', 'credits_cost')

// Après
.select('id', 'created_at', 'competitors', 'credits_cost', 'my_page_url', 'my_page_name', 'competitor_names')
```

**Step 3: Vérifier compilation**

Run: `cd backend && npx tsc --noEmit`

**Step 4: Commit**

```bash
git add backend/src/controllers/benchmarkController.ts
git commit -m "feat: store page names in benchmark_analyses, enrich history endpoint"
```

---

## Task 3 : Frontend — Afficher les noms de pages dans l'historique

**Files:**
- Modify: `src/pages/BenchmarkPage.tsx` (section historique, lignes ~1327-1596)

**Step 1: Enrichir l'affichage de chaque item d'historique**

Actuellement (ligne ~1376) : `{item.competitors?.length || 0} page(s) analysées`

Remplacer par :
- **Ma page** : afficher `item.my_page_name` avec badge "Référence" vert
- **Concurrents** : afficher `item.competitor_names` (JSON array) comme badges gris
- **Fallback** : si les champs sont null (anciennes analyses), garder le compteur

Exemple de rendu :
```
📅 24 fév 2026 — 3.5 crédits
  🟢 honda.madagascar (Référence)
  ⚪ toyota.madagascar · ⚪ hyundai.madagascar
```

**Step 2: Vérifier build**

Run: `npx vite build`

**Step 3: Commit**

```bash
git add src/pages/BenchmarkPage.tsx
git commit -m "feat: display page names in benchmark history"
```

---

## Task 4 : Frontend — PDF complet et fidèle à l'UI

**Files:**
- Modify: `src/pages/BenchmarkPage.tsx` (fonction exportPDF, lignes ~461-823)

**Problème actuel :** Le PDF ne contient que :
1. ✅ Page de couverture
2. ✅ Résumé exécutif (métriques)
3. ✅ Tableau quantitatif
4. ⚠️ Graphiques comparatifs (barres SVG simplifiées — pas de radar)
5. ✅ Classements (médailles)
6. ⚠️ Analyse détaillée par page (partielle)
7. ✅ Top posts
8. ⚠️ Recommandations (basiques)

**Ce qui manque :**
- **Graphique Radar** (visible dans l'onglet "Graphiques") → absent du PDF
- **Analyse Qualitative complète** : fréquence publication, types de contenu, style visuel (caractéristiques), tonalité (caractéristiques), thèmes principaux, réaction audience → partiellement repris
- **Comparatif détaillé** : classements par métrique avec écarts → simplifié
- **Recommandations stratégiques** : texte complet de l'analyse comparative → tronqué

**Step 1: Ajouter section "Analyse Qualitative" complète au PDF**

Après la section "Analyse détaillée par page" (~ligne 754), ajouter pour chaque page :

```html
<!-- Pour chaque page avec qualitative data -->
<div class="page-break">
  <h2>Analyse Qualitative — {pageName}</h2>

  <div class="qual-grid">
    <div class="qual-card">
      <h4>📅 Fréquence de publication</h4>
      <p>{qualitative.publicationFrequency}</p>
    </div>
    <div class="qual-card">
      <h4>📝 Types de contenu</h4>
      <ul>{contentTypes.map(t => <li>{t}</li>)}</ul>
    </div>
    <div class="qual-card">
      <h4>🎨 Style visuel</h4>
      <p>{qualitative.visualStyle.description}</p>
      <ul>{visualStyle.characteristics.map(c => <li>{c}</li>)}</ul>
    </div>
    <div class="qual-card">
      <h4>💬 Tonalité</h4>
      <p>{qualitative.tonality.description}</p>
      <ul>{tonality.characteristics.map(c => <li>{c}</li>)}</ul>
    </div>
    <div class="qual-card">
      <h4>🎯 Thèmes principaux</h4>
      <ul>{mainThemes.map(t => <li>{t}</li>)}</ul>
    </div>
    <div class="qual-card">
      <h4>👥 Réaction de l'audience</h4>
      <p>{qualitative.audienceReaction}</p>
    </div>
  </div>

  <div class="strengths-weaknesses">
    <div class="strengths">
      <h4>✅ Forces</h4>
      <ul>{strengths.map(s => <li>{s}</li>)}</ul>
    </div>
    <div class="weaknesses">
      <h4>⚠️ Faiblesses</h4>
      <ul>{weaknesses.map(w => <li>{w}</li>)}</ul>
    </div>
  </div>
</div>
```

**Step 2: Ajouter section "Comparatif" complète au PDF**

Après les classements, ajouter un tableau comparatif par métrique :

```html
<div class="page-break">
  <h2>Comparatif détaillé</h2>
  <!-- Pour chaque métrique : tableau triés avec écarts vs moyenne -->
  <table>
    <tr><th>Page</th><th>Followers</th><th>Likes/post</th><th>Comments/post</th><th>Engagement %</th><th>Posts/mois</th></tr>
    <!-- Rows triés par engagement desc, highlight de "ma page" -->
  </table>
</div>
```

**Step 3: Ajouter section "Recommandations" complète au PDF**

Reprendre `report.comparativeAnalysis.recommendations` en intégralité avec numérotation et mise en forme.

**Step 4: Vérifier build**

Run: `npx vite build`

**Step 5: Commit**

```bash
git add src/pages/BenchmarkPage.tsx
git commit -m "feat: complete PDF export with qualitative analysis, comparatif and recommendations"
```

---

## Task 5 : Frontend — Simplifier "Période d'analyse"

**Files:**
- Modify: `src/pages/BenchmarkPage.tsx` (lignes 236-270 + 985-1010 + interface BenchmarkConfig)

**Problème actuel :**
- "Dernier mois" = mois calendaire précédent (ex: janvier si on est en février) → confus
- L'utilisateur s'attend à "les 30 derniers jours"
- Les labels ne sont pas intuitifs

**Step 1: Renommer les options et changer la logique**

```typescript
// Avant
type DateRange = 'last_month' | 'last_3_months' | 'last_6_months' | 'last_year';

// Après — labels plus clairs, logique "glissante" (rolling)
const getDateRange = () => {
  const now = new Date();
  switch (config.dateRange) {
    case 'last_30_days': {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return { start, end: now, label: '30 derniers jours' };
    }
    case 'last_90_days': {
      const start = new Date(now);
      start.setDate(start.getDate() - 90);
      return { start, end: now, label: '90 derniers jours' };
    }
    case 'last_6_months': {
      const start = subMonths(now, 6);
      return { start, end: now, label: '6 derniers mois' };
    }
    case 'last_year': {
      const start = subMonths(now, 12);
      return { start, end: now, label: '12 derniers mois' };
    }
    default: {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return { start, end: now, label: '30 derniers jours' };
    }
  }
};
```

**Step 2: Mettre à jour le Select UI**

```tsx
<SelectItem value="last_30_days">30 derniers jours</SelectItem>
<SelectItem value="last_90_days">90 derniers jours</SelectItem>
<SelectItem value="last_6_months">6 derniers mois</SelectItem>
<SelectItem value="last_year">12 derniers mois</SelectItem>
```

Et mettre à jour `BenchmarkConfig.dateRange` default value : `'last_30_days'`

**Step 3: Ajouter un texte explicatif sous le select**

```tsx
<p className="text-xs text-steel mt-2">
  Seuls les posts publiés entre le {format(getDateRange().start, 'd MMM yyyy', { locale: fr })} et le {format(getDateRange().end, 'd MMM yyyy', { locale: fr })} seront analysés.
</p>
```

**Step 4: Vérifier build**

Run: `npx vite build`

**Step 5: Commit**

```bash
git add src/pages/BenchmarkPage.tsx
git commit -m "fix: simplify date range to rolling periods with clearer labels"
```

---

## Task 6 : Build final, push, deploy

**Step 1: Vérifier compilation backend**

Run: `cd backend && npx tsc --noEmit`
Expected: PASS

**Step 2: Vérifier build frontend**

Run: `npx vite build`
Expected: PASS

**Step 3: Vérifier présence des changements**

Run: `grep -r "my_page_name\|competitor_names\|credits_cost" backend/src/ --include="*.ts" | wc -l`
Expected: >= 5

Run: `grep -r "last_30_days\|Analyse Qualitative\|competitor_names" src/ --include="*.tsx" | wc -l`
Expected: >= 3

**Step 4: Commit final + push**

```bash
git add -A
git commit -m "feat: benchmark improvements — history page names, complete PDF, rolling date ranges"
git push origin main
```

**Step 5: Build O2Switch**

```bash
bash build-O2Switch.sh
```

**Step 6: Migration production**

```sql
-- Sur O2Switch via psql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benchmark_analyses' AND column_name = 'credits_cost') THEN
    ALTER TABLE benchmark_analyses ADD COLUMN credits_cost DECIMAL(10,2) NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benchmark_analyses' AND column_name = 'my_page_url') THEN
    ALTER TABLE benchmark_analyses ADD COLUMN my_page_url VARCHAR(500) NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benchmark_analyses' AND column_name = 'my_page_name') THEN
    ALTER TABLE benchmark_analyses ADD COLUMN my_page_name VARCHAR(200) NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benchmark_analyses' AND column_name = 'competitor_names') THEN
    ALTER TABLE benchmark_analyses ADD COLUMN competitor_names JSONB NULL;
  END IF;
END $$;
```

---

## Améliorations futures (hors scope de ce plan)

| Amélioration | Complexité | Impact |
|---|---|---|
| Graphique Radar dans le PDF (SVG ou canvas2image) | Haute | Moyen |
| Notification quand un concurrent échoue au scraping | Basse | Haute |
| Pagination de l'historique (> 20 analyses) | Basse | Moyen |
| Remboursement partiel si concurrent échoue | Moyenne | Haute |
| Analyse qualitative IA complète (OpenRouter) | Haute | Haute |
| Backfill des anciennes analyses (extraire noms depuis JSON) | Moyenne | Basse |
