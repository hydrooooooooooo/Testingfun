# EasyScrapy Landing Redesign & DA Refonte — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refondre la landing page pour présenter toutes les fonctionnalités, et appliquer la nouvelle DA (#1A3263 navy, #547792 steel, #FAB95B gold, #E8E2DB cream) sur l'ensemble de l'application.

**Architecture:** CSS variables globales (index.css) + Tailwind custom colors + Google Fonts (Bricolage Grotesque + DM Sans). La landing est réécrite entièrement. Les pages existantes sont mises à jour en remplaçant les classes Tailwind hardcodées par les nouvelles couleurs custom.

**Tech Stack:** React + TypeScript + Tailwind CSS + shadcn/ui + Google Fonts

---

## Phase 1: Theme Foundation (global)

### Task 1: Update Google Fonts in index.html

**Files:**
- Modify: `index.html`

**Step 1: Replace font links and fix title**

In `index.html`, replace the existing content with updated Google Fonts links for Bricolage Grotesque (display) and DM Sans (body), and fix the title to "EasyScrapy.com".

Add these links in `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap" rel="stylesheet">
```

Fix title: `<title>EasyScrapy.com — Intelligence Sociale</title>`

**Step 2: Commit**
```bash
git add index.html
git commit -m "feat: add Bricolage Grotesque + DM Sans fonts, fix title"
```

---

### Task 2: Update Tailwind config with new palette and fonts

**Files:**
- Modify: `tailwind.config.ts`

**Step 1: Add custom colors and fonts to tailwind config**

Add to `theme.extend.colors`:
```typescript
navy: {
  DEFAULT: '#1A3263',
  50: '#E8EDF5',
  100: '#C5D0E6',
  200: '#8FA3CC',
  300: '#5A76B3',
  400: '#3A5490',
  500: '#1A3263',
  600: '#152850',
  700: '#101E3D',
  800: '#0B142A',
  900: '#0F1D3A',
},
steel: {
  DEFAULT: '#547792',
  50: '#EDF1F4',
  100: '#D4DEE6',
  200: '#A9BDCD',
  300: '#7E9CB4',
  400: '#547792',
  500: '#456275',
  600: '#364D5C',
  700: '#283943',
  800: '#19252C',
},
gold: {
  DEFAULT: '#FAB95B',
  50: '#FEF5E7',
  100: '#FDE8C5',
  200: '#FCD793',
  300: '#FAC56A',
  400: '#FAB95B',
  500: '#F5A623',
  600: '#D4890D',
  700: '#A36A0A',
  800: '#724A07',
},
cream: {
  DEFAULT: '#E8E2DB',
  50: '#F7F5F2',
  100: '#F0ECE7',
  200: '#E8E2DB',
  300: '#D5CCC1',
  400: '#C2B5A7',
  500: '#AF9F8D',
},
```

Replace font families:
```typescript
fontFamily: {
  sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
},
```

**Step 2: Commit**
```bash
git add tailwind.config.ts
git commit -m "feat: add navy/steel/gold/cream palette and display font to tailwind"
```

---

### Task 3: Update CSS variables in index.css

**Files:**
- Modify: `src/index.css`

**Step 1: Remap all CSS variables to new palette**

Replace the `:root` block with HSL values derived from the new palette:
```css
:root {
  --background: 37 23% 97%;        /* #F7F5F2 cream-50 */
  --foreground: 220 55% 15%;       /* #0F1D3A dark-navy */
  --card: 0 0% 100%;               /* white */
  --card-foreground: 220 55% 15%;  /* dark-navy */
  --popover: 0 0% 100%;
  --popover-foreground: 220 55% 15%;
  --primary: 220 57% 24%;          /* #1A3263 navy */
  --primary-foreground: 37 23% 97%;/* cream-50 */
  --secondary: 204 27% 46%;        /* #547792 steel */
  --secondary-foreground: 0 0% 100%;
  --muted: 30 18% 88%;             /* #E8E2DB cream */
  --muted-foreground: 204 27% 46%; /* steel */
  --accent: 37 94% 67%;            /* #FAB95B gold */
  --accent-foreground: 220 55% 15%;/* dark-navy */
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 100%;
  --border: 30 18% 85%;            /* cream-300 */
  --input: 30 18% 85%;
  --ring: 37 94% 67%;              /* gold */
  --radius: 0.75rem;

  /* Sidebar */
  --sidebar-background: 220 57% 24%;   /* navy */
  --sidebar-foreground: 37 23% 97%;    /* cream-50 */
  --sidebar-primary: 37 94% 67%;       /* gold */
  --sidebar-primary-foreground: 220 55% 15%;
  --sidebar-accent: 220 57% 30%;       /* navy-light */
  --sidebar-accent-foreground: 37 23% 97%;
  --sidebar-border: 220 57% 30%;
  --sidebar-ring: 37 94% 67%;
}
```

Dark mode block: adapt accordingly (invert navy/cream relationship).

**Step 2: Add global font styles**

```css
body {
  font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
}

h1, h2, h3, h4, h5, h6 {
  font-family: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif;
}
```

**Step 3: Commit**
```bash
git add src/index.css
git commit -m "feat: remap CSS variables to new DA palette (navy/steel/gold/cream)"
```

---

## Phase 2: Landing Page Rewrite

### Task 4: Rewrite the landing page — Index.tsx

**Files:**
- Modify: `src/pages/Index.tsx` (complete rewrite, ~514 lines → ~600 lines)

**Step 1: Rewrite the entire landing page**

Remove the existing scraping form and all current sections. Replace with:

**Structure (top to bottom):**

1. **Hero Section** (navy full-bleed)
   - Background: `bg-navy` with decorative SVG circles in gold-50 opacity
   - Badge: `bg-gold/20 text-gold` → "Plateforme d'Intelligence Sociale"
   - H1: `font-display text-white` → "Extrayez, analysez et surveillez vos données sociales"
   - Subtitle: `text-steel-200` → description
   - 2 CTA buttons: "Commencer gratuitement" (gold bg) + "Découvrir" (outline white)
   - Stats bar: 3 stats with gold numbers ("10 000+", "99.9%", "48h")

2. **Features Section** (cream bg)
   - Section title centered with `font-display`
   - 3×2 grid of white cards with navy icons and gold accents
   - 6 features: Marketplace, FB Pages, Benchmark, IA, Automations, Mentions
   - Each card: icon in navy circle, title, description, target audience tag in gold

3. **How It Works** (white bg)
   - Horizontal timeline with 3 numbered steps
   - Steps connected by dotted line with gold dots
   - Icons in navy circles, step numbers in gold

4. **Use Cases** (navy bg)
   - 4 cards with cream/white text and gold border-left
   - Immobilier, E-commerce, Automobile, Études de marché
   - Each with icon, title, description, audience tags

5. **Pricing Section** (cream bg)
   - Reuse existing pack loading logic from Pricing.tsx
   - Cards with gold "Populaire" badge
   - CTA buttons in navy

6. **Trust Section** (white bg)
   - 3 cards: Sécurité, Fiabilité, Support
   - Icons in gold circles, text in navy

7. **FAQ** (cream bg)
   - Accordion with 6 questions
   - Navy headers, steel body text

8. **Final CTA** (navy bg with gold pattern)
   - Big headline, gold CTA button

9. **Footer** (dark-navy bg)
   - 4 columns: Produit, Ressources, Légal, Contact
   - Logo in white/gold
   - Social links, copyright

Remove all imports related to the scraping form (ScrapeContext, etc.) since the form moves to dashboard only.

**Step 2: Commit**
```bash
git add src/pages/Index.tsx
git commit -m "feat: rewrite landing page with all features and new DA"
```

---

## Phase 3: Layout Components

### Task 5: Restyle the Header

**Files:**
- Modify: `src/components/layout/Header.tsx`

**Step 1: Apply new DA to header**

- Background: `bg-navy` (instead of `bg-white`)
- Logo text: white with gold `.COM`
- Nav links: `text-cream-200 hover:text-gold`
- Auth buttons: "Se connecter" (outline white) + "Commencer" (bg-gold text-navy)
- Mobile hamburger: white icon
- Mobile sheet: navy background
- Add nav item "Fonctionnalités" linking to `/#features`

**Step 2: Commit**
```bash
git add src/components/layout/Header.tsx
git commit -m "feat: restyle header with navy/gold DA"
```

---

### Task 6: Restyle the CollapsibleSidebar

**Files:**
- Modify: `src/components/layout/CollapsibleSidebar.tsx`

**Step 1: Replace all hardcoded orange/gray with navy/gold/cream**

Replace color mapping:
- `bg-orange-500` → `bg-gold` (active menu items)
- `text-white` (on orange) → `text-navy` (on gold)
- `text-gray-600` → `text-cream-300`
- `hover:bg-gray-100` → `hover:bg-navy-400`
- `bg-white` sidebar bg → `bg-navy`
- `border-gray-200` → `border-navy-400`
- Logo gradient: `from-orange-500 to-orange-600` → `from-gold to-gold-500`
- Credits section: `from-orange-50 to-amber-50` → `from-gold/10 to-gold/20`
- Credits text: `text-orange-600` → `text-gold`
- Avatar gradient: `from-orange-500 to-orange-600` → `from-gold to-gold-500`
- User text: `text-gray-900` → `text-white`, `text-gray-500` → `text-cream-300`
- Collapse button: adapt to navy theme

**Step 2: Commit**
```bash
git add src/components/layout/CollapsibleSidebar.tsx
git commit -m "feat: restyle sidebar with navy/gold DA"
```

---

### Task 7: Restyle DashboardLayout

**Files:**
- Modify: `src/layouts/DashboardLayout.tsx`

**Step 1: Replace orange button with gold**

- `bg-orange-500 hover:bg-orange-600` → `bg-gold hover:bg-gold-500 text-navy`

**Step 2: Commit**
```bash
git add src/layouts/DashboardLayout.tsx
git commit -m "feat: restyle dashboard layout button with gold"
```

---

## Phase 4: Public Pages Recolor

### Task 8: Restyle Pricing.tsx

**Files:**
- Modify: `src/pages/Pricing.tsx`

**Step 1: Replace hardcoded colors**

- `bg-gray-50` → `bg-cream-50`
- `from-green-100 to-emerald-100 text-green-800` → `bg-gold/20 text-navy`
- `text-indigo-600` → `text-navy`
- Section background: cream
- Cards: white with navy text, gold accent for popular

**Step 2: Commit**
```bash
git add src/pages/Pricing.tsx
git commit -m "feat: restyle pricing page with new DA"
```

---

### Task 9: Restyle Support.tsx

**Files:**
- Modify: `src/pages/Support.tsx`

**Step 1: Replace all hardcoded colors (79 instances)**

Systematic replacements:
- Hero badge: `bg-blue-50 text-blue-700` → `bg-gold/20 text-navy`
- Title accent: `text-blue-600` → `text-gold`
- Trust icons: all become `text-gold` or `text-navy`
- Contact section: `from-blue-50 to-indigo-50 border-blue-200` → `bg-cream border-cream-300`
- CTA button: `bg-blue-600 hover:bg-blue-700` → `bg-navy hover:bg-navy-400`
- Response time cards: use `bg-cream` with `border-cream-300` and `text-navy` dots
- Support type icons: all get `bg-navy/10 text-navy` backgrounds
- Final CTA: `from-gray-900 to-gray-800` → `bg-navy`
- FAQ background: `bg-gray-50` → `bg-cream-50`

**Step 2: Commit**
```bash
git add src/pages/Support.tsx
git commit -m "feat: restyle support page with new DA"
```

---

### Task 10: Restyle Models.tsx

**Files:**
- Modify: `src/pages/Models.tsx`

**Step 1: Replace hardcoded colors**

- Hero: `from-blue-50 to-purple-50` → `bg-cream`
- Badge accent: `text-blue-600` → `text-gold`
- Example file cards: replace blue/green/purple/orange gradients with navy/steel/gold/cream variants
- Data columns section: `bg-gray-50` → `bg-cream-50`, dots → gold
- Quality icons: all → `text-navy` or `text-gold`
- CTA section: `from-primary/5 to-primary/10` → `bg-navy/5`

**Step 2: Commit**
```bash
git add src/pages/Models.tsx
git commit -m "feat: restyle models page with new DA"
```

---

### Task 11: Restyle Auth pages (Login, Register, ForgotPassword)

**Files:**
- Modify: `src/pages/LoginPage.tsx`
- Modify: `src/pages/RegisterPage.tsx`
- Modify: `src/pages/ForgotPassword.tsx`
- Modify: `src/pages/RegisterSuccessPage.tsx`
- Modify: `src/pages/VerifyEmailSuccess.tsx`
- Modify: `src/pages/VerifyEmailError.tsx`

**Step 1: Replace hardcoded colors in all auth pages**

- `text-gray-600` → `text-steel`
- `text-amber-*` → `text-gold-*`
- `bg-blue-*` → `bg-navy-*`
- `text-blue-*` → `text-navy`
- `bg-green-*` success → keep green for semantic meaning but use `text-navy` for text
- `bg-red-*` error → keep red for semantic meaning
- Link colors: `text-blue-600 hover:text-blue-700` → `text-navy hover:text-navy-400`

**Step 2: Commit**
```bash
git add src/pages/LoginPage.tsx src/pages/RegisterPage.tsx src/pages/ForgotPassword.tsx src/pages/RegisterSuccessPage.tsx src/pages/VerifyEmailSuccess.tsx src/pages/VerifyEmailError.tsx
git commit -m "feat: restyle auth pages with new DA"
```

---

### Task 12: Restyle payment result pages

**Files:**
- Modify: `src/pages/PaymentSuccess.tsx`
- Modify: `src/pages/PaymentError.tsx`
- Modify: `src/pages/DownloadPage.tsx`

**Step 1: Replace hardcoded colors**

Same pattern: blue → navy, gray → steel/cream, keep semantic red/green for status.

**Step 2: Commit**
```bash
git add src/pages/PaymentSuccess.tsx src/pages/PaymentError.tsx src/pages/DownloadPage.tsx
git commit -m "feat: restyle payment/download pages with new DA"
```

---

## Phase 5: Dashboard Pages Recolor

### Task 13: Restyle major dashboard pages (batch 1)

**Files:**
- Modify: `src/pages/DashboardPage.tsx`
- Modify: `src/pages/CreditsPage.tsx`
- Modify: `src/pages/ExtractionsPage.tsx`
- Modify: `src/pages/PaymentsPage.tsx`

**Step 1: Replace hardcoded colors in all 4 files**

Systematic replacements across all files:
- `text-gray-900` → `text-navy-900` or `text-foreground`
- `text-gray-600` / `text-gray-500` → `text-steel`
- `border-gray-200` → `border-cream-300`
- `bg-gray-50` / `bg-gray-100` → `bg-cream-50` / `bg-cream-100`
- `text-blue-600` / `text-blue-500` → `text-navy`
- `bg-blue-*` → `bg-navy-*`
- `text-orange-*` / `bg-orange-*` → `text-gold-*` / `bg-gold-*`
- Keep semantic colors: red for destructive/error, green for success

**Step 2: Commit**
```bash
git add src/pages/DashboardPage.tsx src/pages/CreditsPage.tsx src/pages/ExtractionsPage.tsx src/pages/PaymentsPage.tsx
git commit -m "feat: restyle dashboard/credits/extractions/payments with new DA"
```

---

### Task 14: Restyle major dashboard pages (batch 2)

**Files:**
- Modify: `src/pages/MarketplacePage.tsx`
- Modify: `src/pages/MarketplaceFilesPage.tsx`
- Modify: `src/pages/FacebookPagesPage.tsx`
- Modify: `src/pages/FacebookPagesFilesPage.tsx` (235 hardcoded instances — biggest file)

**Step 1: Same systematic replacements as Task 13**

Focus especially on FacebookPagesFilesPage.tsx which has 235 instances.

**Step 2: Commit**
```bash
git add src/pages/MarketplacePage.tsx src/pages/MarketplaceFilesPage.tsx src/pages/FacebookPagesPage.tsx src/pages/FacebookPagesFilesPage.tsx
git commit -m "feat: restyle marketplace and facebook pages with new DA"
```

---

### Task 15: Restyle major dashboard pages (batch 3)

**Files:**
- Modify: `src/pages/BenchmarkPage.tsx` (234 instances)
- Modify: `src/pages/AiAnalysesPage.tsx` (124 instances)
- Modify: `src/pages/AutomationsPage.tsx` (78 instances)
- Modify: `src/pages/MentionsPage.tsx` (120 instances)
- Modify: `src/pages/MentionSettingsPage.tsx`

**Step 1: Same systematic replacements**

For BenchmarkPage and AiAnalysesPage, pay attention to chart colors (cyan, purple, pink) — replace with navy/steel/gold variants for data viz consistency.

**Step 2: Commit**
```bash
git add src/pages/BenchmarkPage.tsx src/pages/AiAnalysesPage.tsx src/pages/AutomationsPage.tsx src/pages/MentionsPage.tsx src/pages/MentionSettingsPage.tsx
git commit -m "feat: restyle benchmark/ai/automations/mentions with new DA"
```

---

### Task 16: Restyle dashboard sub-components

**Files:**
- Modify: `src/components/dashboard/DashboardHeader.tsx`
- Modify: `src/components/dashboard/SessionItemsView.tsx`
- Modify: `src/components/dashboard/FacebookPagesSessionCard.tsx`
- Modify: `src/components/dashboard/SessionStatsPanel.tsx`
- Modify: `src/components/dashboard/AuditDetailView.tsx`
- Modify: `src/components/dashboard/BenchmarkDetailView.tsx`
- Modify: `src/components/dashboard/InsightsCard.tsx`
- Modify: `src/components/dashboard/RecentActivityCard.tsx`
- Modify: `src/components/dashboard/TopContentSection.tsx`
- Modify: `src/components/dashboard/TopContentCard.tsx`
- Modify: `src/components/dashboard/ItemCard.tsx`
- Modify: `src/components/dashboard/ItemDetailModal.tsx`
- Modify: `src/components/dashboard/ItemsList.tsx`

**Step 1: Same systematic replacements across all dashboard sub-components**

**Step 2: Commit**
```bash
git add src/components/dashboard/
git commit -m "feat: restyle all dashboard sub-components with new DA"
```

---

### Task 17: Restyle AdminLayout and remaining components

**Files:**
- Modify: `src/layouts/AdminLayout.tsx`
- Modify: `src/pages/AdminDashboard.tsx`
- Modify: `src/pages/NotFound.tsx`

**Step 1: Apply same color replacements**

**Step 2: Commit**
```bash
git add src/layouts/AdminLayout.tsx src/pages/AdminDashboard.tsx src/pages/NotFound.tsx
git commit -m "feat: restyle admin layout and remaining pages with new DA"
```

---

## Phase 6: Standalone Components Recolor

### Task 18: Restyle standalone feature components

**Files:**
- Check and modify: `src/components/CreditBadge.tsx`
- Check and modify: `src/components/CostEstimator.tsx`
- Check and modify: `src/components/FacebookPagesProgress.tsx`
- Check and modify: `src/components/InsufficientCreditsModal.tsx`
- Check and modify: `src/components/TrialPopup.tsx`
- Check and modify: `src/components/ScrollToTop.tsx`
- Check and modify any other components with hardcoded colors

**Step 1: Scan and replace hardcoded colors**

**Step 2: Commit**
```bash
git add src/components/
git commit -m "feat: restyle standalone components with new DA"
```

---

## Phase 7: Cleanup & Verify

### Task 19: Remove Index copy.tsx and verify no remaining old colors

**Files:**
- Delete: `src/pages/Index copy.tsx` (if tracked)
- Verify: grep for remaining `blue-500`, `orange-500`, `purple-500` that aren't semantic

**Step 1: Run color audit**
```bash
grep -rn "blue-500\|blue-600\|blue-700\|orange-500\|orange-600\|purple-500\|purple-600" src/ --include="*.tsx" | grep -v "node_modules"
```

Only remaining hits should be semantic (success green, destructive red).

**Step 2: Fix any remaining hardcoded colors**

**Step 3: Commit**
```bash
git commit -m "chore: cleanup old color references and remove duplicate files"
```

---

### Task 20: Build verification

**Step 1: Run build**
```bash
npm run build
```
Expected: 0 errors

**Step 2: Fix any TypeScript or build errors**

**Step 3: Final commit and push**
```bash
git push origin main
```

---

## Color Replacement Quick Reference

| Old Class Pattern | New Class |
|-------------------|-----------|
| `text-gray-900` | `text-navy-900` or `text-foreground` |
| `text-gray-700` | `text-navy-700` |
| `text-gray-600` / `text-gray-500` | `text-steel` |
| `text-gray-400` | `text-steel-200` |
| `bg-gray-50` / `bg-gray-100` | `bg-cream-50` / `bg-cream-100` |
| `border-gray-200` / `border-gray-300` | `border-cream-300` / `border-cream-400` |
| `text-blue-600` / `text-blue-700` | `text-navy` |
| `bg-blue-600` / `bg-blue-700` | `bg-navy` / `bg-navy-400` |
| `bg-blue-50` / `bg-blue-100` | `bg-navy-50` / `bg-navy-100` |
| `border-blue-200` | `border-navy-200` |
| `text-orange-500` / `text-orange-600` | `text-gold` / `text-gold-500` |
| `bg-orange-500` / `bg-orange-600` | `bg-gold` / `bg-gold-500` |
| `bg-orange-50` / `bg-orange-100` | `bg-gold-50` / `bg-gold-100` |
| `text-purple-600` | `text-steel` |
| `bg-purple-600` | `bg-steel` |
| `bg-purple-50` | `bg-steel-50` |
| `from-blue-600 to-purple-600` | `from-navy to-steel` |
| `from-gray-900 to-gray-800` | `bg-navy-900` |
| `text-indigo-600` | `text-navy` |
| `text-amber-*` | `text-gold-*` |
| `from-orange-500 to-orange-600` | `from-gold to-gold-500` |

**Keep unchanged (semantic):**
- `text-red-*` / `bg-red-*` → destructive/error states
- `text-green-*` / `bg-green-*` → success states (but can use `text-navy` for associated text)
