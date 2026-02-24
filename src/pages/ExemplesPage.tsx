import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart, Landmark, Hotel, UtensilsCrossed,
  Home, Megaphone, ArrowRight, Sparkles, BarChart3,
  Download, Bell, GitCompare, Facebook, Store
} from 'lucide-react';

interface UseCaseExample {
  sector: string;
  icon: React.ElementType;
  accent: string;      // bg color for icon pill
  accentText: string;  // text color for accent
  scenario: string;
  steps: { label: string; detail: string; feature: string; featureIcon: React.ElementType }[];
  result: string;
}

const examples: UseCaseExample[] = [
  {
    sector: 'E-commerce & Retail',
    icon: ShoppingCart,
    accent: 'bg-emerald-500/10',
    accentText: 'text-emerald-600',
    scenario: 'Un vendeur de vêtements veut surveiller les prix de ses concurrents sur Facebook Marketplace à Antananarivo.',
    steps: [
      { label: 'Extraction', detail: 'Il colle l\'URL de recherche Marketplace "vêtements Antananarivo" et lance le scraping.', feature: 'Marketplace Scraper', featureIcon: Store },
      { label: 'Export', detail: 'Il télécharge les 200 annonces en Excel avec prix, localisation et photos.', feature: 'Export Excel/CSV', featureIcon: Download },
      { label: 'Veille', detail: 'Il programme une extraction automatique chaque lundi pour suivre les évolutions.', feature: 'Automatisations', featureIcon: Bell },
    ],
    result: 'Il ajuste ses prix chaque semaine en se basant sur les données réelles du marché, pas sur des suppositions.',
  },
  {
    sector: 'Banque & Finance',
    icon: Landmark,
    accent: 'bg-blue-500/10',
    accentText: 'text-blue-600',
    scenario: 'Une banque malgache veut comparer sa communication Facebook avec ses concurrentes (BNI, BOA, BRED).',
    steps: [
      { label: 'Extraction', detail: 'Elle extrait les publications des 4 pages bancaires des 3 derniers mois.', feature: 'Facebook Pages', featureIcon: Facebook },
      { label: 'Benchmark', detail: 'Elle lance un benchmark concurrentiel pour comparer likes, commentaires et partages.', feature: 'Benchmark IA', featureIcon: GitCompare },
      { label: 'Analyse', detail: 'L\'IA identifie que les posts éducatifs ("comment épargner") génèrent 3× plus d\'engagement.', feature: 'Analyse IA', featureIcon: Sparkles },
    ],
    result: 'Elle réoriente sa stratégie de contenu vers l\'éducation financière et double son engagement en 2 mois.',
  },
  {
    sector: 'Hôtellerie & Tourisme',
    icon: Hotel,
    accent: 'bg-amber-500/10',
    accentText: 'text-amber-600',
    scenario: 'Un hôtel de Nosy Be veut comprendre ce que ses clients et ceux de ses concurrents disent en ligne.',
    steps: [
      { label: 'Extraction', detail: 'Il scrape les pages Facebook de 5 hôtels concurrents avec leurs publications et commentaires.', feature: 'Pages + Commentaires', featureIcon: Facebook },
      { label: 'Analyse', detail: 'L\'IA analyse le sentiment des commentaires et identifie les plaintes récurrentes (Wi-Fi, petit-déjeuner).', feature: 'Analyse IA', featureIcon: Sparkles },
      { label: 'Action', detail: 'Il exporte un rapport PDF avec les recommandations priorisées pour son équipe.', feature: 'Export PDF', featureIcon: Download },
    ],
    result: 'Il corrige ses points faibles avant la haute saison et met en avant ses avantages dans sa communication.',
  },
  {
    sector: 'Restauration',
    icon: UtensilsCrossed,
    accent: 'bg-rose-500/10',
    accentText: 'text-rose-600',
    scenario: 'Un restaurateur veut savoir quels plats et concepts sont tendance sur le marché local.',
    steps: [
      { label: 'Extraction', detail: 'Il extrait les publications des 10 restaurants les plus populaires de Tana sur Facebook.', feature: 'Facebook Pages', featureIcon: Facebook },
      { label: 'Analyse', detail: 'L\'IA détecte que les posts avec vidéos de préparation génèrent 5× plus de partages.', feature: 'Analyse IA', featureIcon: Sparkles },
      { label: 'Benchmark', detail: 'Le benchmark révèle qu\'il publie 2× moins que la moyenne du secteur.', feature: 'Benchmark IA', featureIcon: GitCompare },
    ],
    result: 'Il lance une série de vidéos "en cuisine" et augmente sa fréquence de publication — réservations en hausse.',
  },
  {
    sector: 'Immobilier',
    icon: Home,
    accent: 'bg-violet-500/10',
    accentText: 'text-violet-600',
    scenario: 'Une agence immobilière veut cartographier le marché locatif sur Facebook Marketplace.',
    steps: [
      { label: 'Extraction', detail: 'Elle lance une recherche "appartement à louer Antananarivo" et scrape 500 annonces.', feature: 'Marketplace Scraper', featureIcon: Store },
      { label: 'Export', detail: 'Elle exporte en Excel : prix, surface, quartier, photos — prêt pour analyse.', feature: 'Export Excel', featureIcon: Download },
      { label: 'Veille', detail: 'Une extraction automatique hebdomadaire lui signale les nouvelles annonces sous-cotées.', feature: 'Automatisations', featureIcon: Bell },
    ],
    result: 'Elle identifie les opportunités avant la concurrence et constitue une base de données immobilière locale unique.',
  },
  {
    sector: 'Agence Marketing',
    icon: Megaphone,
    accent: 'bg-gold/10',
    accentText: 'text-gold-700',
    scenario: 'Une agence doit auditer la présence Facebook d\'un nouveau client et proposer une stratégie.',
    steps: [
      { label: 'Extraction', detail: 'Elle extrait 6 mois de publications de la page du client et de 3 concurrents.', feature: 'Facebook Pages', featureIcon: Facebook },
      { label: 'Audit IA', detail: 'L\'analyse IA produit un score d\'engagement, identifie les top/flop posts et génère des recommandations.', feature: 'Analyse IA', featureIcon: Sparkles },
      { label: 'Rapport', detail: 'Elle exporte un rapport PDF professionnel à présenter au client.', feature: 'Export PDF', featureIcon: Download },
    ],
    result: 'En 15 minutes, elle produit un audit qui aurait pris 2 jours manuellement — son client est impressionné.',
  },
];

export default function ExemplesPage() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-cream-50">

      {/* ─── HERO ─── */}
      <section className="relative w-full bg-navy overflow-hidden">
        <div className="absolute top-10 right-20 w-80 h-80 bg-gold/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 left-10 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 text-center">
          <p className="text-gold text-[11px] font-semibold uppercase tracking-[0.25em] mb-4">
            Cas d'usage concrets
          </p>
          <h1 className="font-display text-white text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-5">
            Un outil, des dizaines
            <span className="block text-gold mt-1">de métiers.</span>
          </h1>
          <p className="text-steel-200 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Découvrez comment des professionnels de secteurs très différents utilisent EasyScrapy
            pour prendre de meilleures décisions, plus vite.
          </p>
        </div>
      </section>

      {/* ─── EXAMPLES GRID ─── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="space-y-12 lg:space-y-16">
          {examples.map((ex, idx) => (
            <article
              key={idx}
              className="relative bg-white rounded-2xl border border-cream-300 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300"
            >
              {/* Sector header bar */}
              <div className="flex items-center gap-4 px-6 sm:px-8 py-5 border-b border-cream-200">
                <div className={`w-11 h-11 ${ex.accent} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <ex.icon className={`w-5 h-5 ${ex.accentText}`} />
                </div>
                <div>
                  <h2 className="font-display text-navy text-lg sm:text-xl font-bold">{ex.sector}</h2>
                </div>
                <span className="hidden sm:inline-block ml-auto text-[11px] font-mono text-steel bg-cream-100 px-3 py-1 rounded-full">
                  exemple {String(idx + 1).padStart(2, '0')}
                </span>
              </div>

              <div className="px-6 sm:px-8 py-6 sm:py-8">
                {/* Scenario */}
                <div className="mb-8">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-steel mb-2">Scénario</p>
                  <p className="text-navy text-[15px] sm:text-base leading-relaxed font-medium">
                    {ex.scenario}
                  </p>
                </div>

                {/* Steps */}
                <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
                  {ex.steps.map((step, si) => (
                    <div key={si} className="relative">
                      {/* Step number + connector */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-7 h-7 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                          <span className="text-gold text-[11px] font-bold font-mono">{si + 1}</span>
                        </div>
                        <span className="text-navy text-[13px] font-bold uppercase tracking-wide">{step.label}</span>
                        {si < ex.steps.length - 1 && (
                          <ArrowRight className="w-3.5 h-3.5 text-cream-400 hidden sm:block ml-auto" />
                        )}
                      </div>
                      {/* Detail */}
                      <p className="text-steel text-[13px] leading-relaxed pl-10">
                        {step.detail}
                      </p>
                      {/* Feature tag */}
                      <div className="flex items-center gap-1.5 mt-3 pl-10">
                        <step.featureIcon className="w-3 h-3 text-gold" />
                        <span className="text-[11px] text-gold-700 font-medium bg-gold/10 px-2 py-0.5 rounded-full">
                          {step.feature}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Result */}
                <div className="bg-navy/[0.03] border border-navy/10 rounded-xl px-5 py-4 flex items-start gap-4">
                  <div className="w-8 h-8 bg-gold/15 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <BarChart3 className="w-4 h-4 text-gold" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gold-700 mb-1">Résultat</p>
                    <p className="text-navy text-[14px] leading-relaxed font-medium">{ex.result}</p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ─── CTA SECTION ─── */}
      <section className="relative w-full bg-navy overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-gold/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-20 w-64 h-64 bg-gold/5 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-24 text-center">
          <p className="text-gold text-[11px] font-semibold uppercase tracking-[0.25em] mb-4">
            Prêt à essayer ?
          </p>
          <h2 className="font-display text-white text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight mb-5">
            Votre secteur n'est pas listé ?
            <span className="block text-gold mt-1">Ça marche aussi.</span>
          </h2>
          <p className="text-steel-200 text-base max-w-xl mx-auto leading-relaxed mb-10">
            Tant qu'il y a des données sur Facebook Marketplace ou des Pages Facebook,
            EasyScrapy peut les extraire et les analyser pour vous.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button className="h-12 px-8 bg-gold text-navy font-bold text-[15px] hover:bg-gold-300 transition-all shadow-lg hover:shadow-xl rounded-xl">
                Créer un compte gratuit
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="outline" className="h-12 px-8 border-cream-200 bg-transparent text-white hover:bg-white/10 rounded-xl">
                Voir les tarifs
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
