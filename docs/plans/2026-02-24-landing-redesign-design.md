# Design Document — EasyScrapy Refonte Landing Page & Direction Artistique

**Date**: 2026-02-24
**Status**: Approved

## 1. Objectif

Refondre la landing page pour présenter TOUTES les fonctionnalités de l'application (Marketplace, Facebook Pages, Benchmark, IA, Automatisations, Mentions) et appliquer une nouvelle direction artistique uniforme sur l'ensemble de l'application (landing, dashboard, pages publiques, auth).

## 2. Direction Artistique

### Palette de couleurs

| Token              | Hex       | RGB              | Usage                                          |
|---------------------|-----------|------------------|-------------------------------------------------|
| `--navy`            | `#1A3263` | rgb(26, 50, 99)  | Backgrounds hero/footer, sidebar, CTA primaires |
| `--steel`           | `#547792` | rgb(84, 119, 146)| Textes secondaires, bordures, hover states      |
| `--gold`            | `#FAB95B` | rgb(250, 185, 91)| Accents, badges, highlights, CTA secondaires    |
| `--cream`           | `#E8E2DB` | rgb(232, 226, 219)| Backgrounds sections alternées, surfaces cards  |
| `--white`           | `#FFFFFF` |                  | Backgrounds principaux, cards                   |
| `--dark-navy`       | `#0F1D3A` |                  | Texte principal, footer deep                    |
| `--navy-light`      | `#243B6A` |                  | Hover sur navy, cards sur fond sombre           |
| `--gold-light`      | `#FCD793` |                  | Hover sur gold, backgrounds dorés subtils       |
| `--destructive`     | `#E53E3E` |                  | Erreurs, alertes                                |
| `--success`         | `#38A169` |                  | Succès, validations                             |

### Typographie

- **Display/Titres**: Bricolage Grotesque (Google Fonts, Variable, 200-800)
- **Corps**: DM Sans (Google Fonts, Variable, 400-700)
- Pas d'Inter, Roboto, Arial, ou polices system génériques

### Esthétique

- **Ton**: Premium mais accessible
- **Style**: Épuré, espaces généreux, micro-animations subtiles
- **Éléments décoratifs**: Cercles dorés translucides, lignes géométriques, gradients navy→steel
- **Formes**: Border-radius moyens (12-16px sur cards), boutons avec radius 8-12px
- **Ombres**: Subtiles, ton bleu (0 4px 20px rgba(26,50,99,0.08))

## 3. Structure Landing Page

### 3.1 Header (global)
- Background navy `#1A3263`
- Logo "EASYSCRAPY" en blanc, ".COM" en doré
- Navigation: Accueil | Fonctionnalités | Tarifs | Support | Modèles
- CTA: "Se connecter" (outline blanc) | "Commencer" (bouton doré)
- Mobile: hamburger blanc

### 3.2 Hero Section
- Full-bleed navy background avec éléments décoratifs (cercles dorés, pattern géométrique subtle)
- Badge doré: "Plateforme d'Intelligence Sociale"
- H1 blanc: "Extrayez, analysez et surveillez vos données sociales"
- Sous-titre steel-light: description de la plateforme
- 2 CTA: "Commencer gratuitement" (doré) + "Découvrir les fonctionnalités" (outline blanc)
- Stats animées: "10 000+ extractions" | "99.9% fiabilité" | "Support 48h"
- Illustration: mockup du dashboard (ou animation CSS d'un flux de données)

### 3.3 Section Fonctionnalités (6 features)
- Background cream `#E8E2DB`
- Titre de section centré
- Grille 3×2 de cards blanches avec:

1. **Extraction Marketplace** — Icône ShoppingBag
   - "Transformez une recherche Facebook Marketplace en fichier Excel en 3 minutes"
   - Cible: agents immobiliers, revendeurs, e-commerçants

2. **Facebook Pages** — Icône FileText
   - "Analysez les publications et l'engagement de n'importe quelle Page Facebook"
   - Cible: community managers, agences social media

3. **Benchmark Concurrentiel** — Icône TrendingUp
   - "Comparez les performances de marques concurrentes en un clic"
   - Cible: directeurs marketing, analystes stratégiques

4. **Analyses IA** — Icône Sparkles
   - "L'intelligence artificielle décrypte vos données et génère des insights actionnables"
   - Cible: data analysts, décideurs

5. **Automatisations** — Icône Calendar
   - "Programmez des extractions récurrentes et recevez vos données sans effort"
   - Cible: équipes marketing, veilleurs stratégiques

6. **Surveillance & Mentions** — Icône Bell
   - "Soyez alerté dès qu'on parle de votre marque sur les réseaux"
   - Cible: responsables e-réputation, RP

### 3.4 Comment ça marche
- Background blanc
- Timeline horizontale connectée, 3 étapes:
  1. "Inscrivez-vous" — icône UserPlus, "Créez votre compte en 30 secondes"
  2. "Configurez" — icône Settings, "Choisissez votre type d'extraction et vos paramètres"
  3. "Récupérez" — icône Download, "Téléchargez vos données en Excel, prêtes à l'emploi"
- Ligne de connexion navy avec points dorés

### 3.5 Cas d'usage
- Background navy (section sombre)
- 4 cards avec bordure dorée:
  1. **Immobilier** — "Agents, promoteurs, investisseurs : suivez les prix du marché en temps réel"
  2. **E-commerce** — "Analysez les prix, stocks et stratégies de vos concurrents"
  3. **Automobile** — "Évaluez la valeur de véhicules et suivez les tendances du marché"
  4. **Études de marché** — "Collectez des données terrain pour vos analyses sectorielles"

### 3.6 Tarification
- Background cream
- Titre + sous-titre
- Chargement dynamique des packs via API (existant)
- Cards blanches avec accent doré pour le pack recommandé
- Badge "Populaire" en doré

### 3.7 Confiance & Sécurité
- Background blanc
- 3 cards avec icônes et descriptions:
  - Shield: "100% Sécurisé" — chiffrement, pas de stockage de données
  - TrendingUp: "99.9% Fiable" — infrastructure robuste
  - Users: "Support Expert" — équipe disponible sous 48h

### 3.8 FAQ
- Background cream
- Accordion avec 6 questions (les 4 actuelles + 2 nouvelles sur les nouvelles fonctionnalités)

### 3.9 CTA Final
- Full-bleed navy avec pattern doré
- "Prêt à transformer vos données sociales en avantage concurrentiel ?"
- CTA doré centré

### 3.10 Footer
- Background dark-navy `#0F1D3A`
- 4 colonnes: Produit | Ressources | Légal | Contact
- Logo + tagline
- Copyright

## 4. Scope Dashboard & App-wide

### 4.1 CSS Variables (index.css)
Remapper toutes les variables HSL vers la nouvelle palette:
- `--primary` → Navy #1A3263
- `--secondary` → Steel #547792
- `--accent` → Gold #FAB95B
- `--background` → White
- `--foreground` → Dark Navy #0F1D3A
- `--muted` → Cream #E8E2DB
- `--card` → White
- `--border` → Cream foncé
- Dark mode: adapter en conséquence

### 4.2 Tailwind Config
- Étendre les couleurs avec `navy`, `steel`, `gold`, `cream`
- Ajouter les fonts Bricolage Grotesque + DM Sans

### 4.3 Sidebar (CollapsibleSidebar.tsx)
- Background navy au lieu de blanc/gris
- Items actifs: fond gold avec texte navy
- Items inactifs: texte cream/blanc avec hover steel
- Logo en blanc/doré
- Credits badge: fond gold

### 4.4 Header Dashboard
- Background navy, texte blanc

### 4.5 Pages publiques (Pricing, Support, Models, Auth)
- Appliquer la palette via CSS variables (automatique pour shadcn)
- Vérifier les couleurs hardcodées (Tailwind classes) et les remplacer

### 4.6 Pages Dashboard
- Cards, boutons, badges adaptés via les variables CSS
- Vérifier et remplacer les classes Tailwind hardcodées (blue-500, orange-500, etc.)

## 5. Fichiers impactés (estimation)

### Globaux (thème)
- `src/index.css` — CSS variables
- `tailwind.config.ts` — palette + fonts
- `index.html` — Google Fonts links

### Landing
- `src/pages/Index.tsx` — refonte complète

### Layout
- `src/components/layout/Header.tsx` — nouveau header
- `src/components/layout/Footer.tsx` — nouveau footer (si existant, sinon créer dans Index)
- `src/components/layout/CollapsibleSidebar.tsx` — recoloration sidebar

### Pages publiques
- `src/pages/Pricing.tsx`
- `src/pages/Support.tsx`
- `src/pages/Models.tsx`
- `src/pages/Login.tsx`
- `src/pages/Register.tsx`
- `src/pages/ForgotPassword.tsx`

### Pages dashboard (vérification couleurs hardcodées)
- `src/pages/Dashboard.tsx`
- `src/pages/CreditsPage.tsx`
- `src/pages/ExtractionsPage.tsx`
- `src/pages/MarketplacePage.tsx`
- `src/pages/FacebookPagesPage.tsx`
- `src/pages/BenchmarkPage.tsx`
- `src/pages/AiAnalysesPage.tsx`
- `src/pages/AutomationsPage.tsx`
- `src/pages/MentionsPage.tsx`
- `src/pages/PaymentsPage.tsx`
- + toutes les sous-pages (files, settings, etc.)

## 6. Hors scope

- Le formulaire de scraping reste dans le dashboard uniquement (retiré de la landing)
- Pas de nouvelles fonctionnalités backend
- Pas de dark mode dans cette itération (on stabilise le light mode d'abord)
