import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  ShoppingBag, FileText, TrendingUp, Sparkles, Calendar, Bell,
  Shield, Users, Home, Car, BarChart3, UserPlus, Settings, Download,
  ArrowRight, Zap
} from "lucide-react";
import SEOHead from '@/components/seo/SEOHead';
import { organizationSchema, faqSchema, softwareApplicationSchema } from '@/components/seo/schemas';

export default function Index() {
  /* ---------- Pricing packs from API ---------- */
  const [packs, setPacks] = useState<any[]>([]);
  const [loadingPacks, setLoadingPacks] = useState(true);

  useEffect(() => {
    fetch("/api/packs")
      .then((res) => res.json())
      .then((data) => {
        setPacks(data);
        setLoadingPacks(false);
      })
      .catch(() => setLoadingPacks(false));
  }, []);

  /* ---------- Features data ---------- */
  const features = [
    {
      icon: ShoppingBag,
      title: "Analyse Marketplace",
      description:
        "Transformez une recherche Facebook Marketplace en fichier Excel structuré en 3 minutes. Titres, prix, descriptions, images, localisations.",
      tag: "Agents immo · E-commerce · Revendeurs",
    },
    {
      icon: FileText,
      title: "Analyse Facebook Pages",
      description:
        "Analysez les publications, l'engagement et la stratégie de contenu de n'importe quelle Page Facebook.",
      tag: "Community managers · Agences",
    },
    {
      icon: TrendingUp,
      title: "Benchmark Concurrentiel",
      description:
        "Comparez les performances de marques concurrentes : engagement, fréquence de publication, types de contenu.",
      tag: "Directeurs marketing · Analystes",
    },
    {
      icon: Sparkles,
      title: "Analyses IA",
      description:
        "L'intelligence artificielle décrypte vos données et génère des insights actionnables pour votre stratégie.",
      tag: "Data analysts · Décideurs",
    },
    {
      icon: Calendar,
      title: "Automatisations",
      description:
        "Programmez des collectes récurrentes et recevez vos données automatiquement, sans intervention.",
      tag: "Équipes marketing · Veilleurs",
    },
    {
      icon: Bell,
      title: "Surveillance & Mentions",
      description:
        "Soyez alerté en temps réel dès que votre marque, vos produits ou vos concurrents sont mentionnés.",
      tag: "E-réputation · Relations presse",
    },
  ];

  /* ---------- Use cases data ---------- */
  const useCases = [
    {
      icon: Home,
      title: "Immobilier",
      description:
        "Suivez les prix, identifiez les opportunités et analysez le marché locatif ou de vente en temps réel.",
      audience: "Agents · Promoteurs · Investisseurs",
    },
    {
      icon: ShoppingBag,
      title: "E-commerce",
      description:
        "Analysez les prix, la disponibilité et les stratégies de vos concurrents sur Marketplace.",
      audience: "Vendeurs · Analystes pricing",
    },
    {
      icon: Car,
      title: "Automobile",
      description:
        "Évaluez la cote des véhicules, suivez les tendances et trouvez les meilleures affaires.",
      audience: "Concessionnaires · Particuliers",
    },
    {
      icon: BarChart3,
      title: "Études de marché",
      description:
        "Collectez des données terrain à grande échelle pour alimenter vos analyses sectorielles.",
      audience: "Cabinets conseil · Chercheurs",
    },
  ];

  /* ---------- FAQ data ---------- */
  const faqItems = [
    {
      question: "Quelles données puis-je collecter ?",
      answer:
        "Titres, prix, descriptions, images, localisations, contacts, URLs… Toutes les données sont organisées dans un fichier Excel prêt à utiliser.",
    },
    {
      question: "C'est vraiment si rapide ?",
      answer:
        "Oui ! 3 minutes en moyenne pour collecter des centaines d'annonces, au lieu des heures de copier-coller manuel.",
    },
    {
      question: "Mes données sont-elles protégées ?",
      answer:
        "Absolument. Nous ne stockons aucune donnée. Vos URL et données sont traitées en temps réel puis supprimées automatiquement.",
    },
    {
      question: "Dois-je m'abonner ?",
      answer:
        "Non ! Pas d'abonnement. Vous achetez des crédits et les utilisez quand vous voulez. Idéal pour une utilisation ponctuelle ou régulière.",
    },
    {
      question: "Quelles sont les fonctionnalités avancées ?",
      answer:
        "Au-delà de la collecte, Easy propose l'analyse IA de vos données, le benchmark concurrentiel, les automatisations programmées et la surveillance de mentions en temps réel.",
    },
    {
      question: "Comment fonctionne le système de crédits ?",
      answer:
        "Vous achetez un pack de crédits. Chaque analyse consomme un nombre de crédits proportionnel au volume de données. Vos crédits n'expirent jamais.",
    },
  ];

  /* ---------- Price formatter ---------- */
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("fr-MG").format(price);

  return (
    <div className="flex flex-col min-h-screen w-full">
      <SEOHead
        title="Social Media Analytics pour Agences"
        description="Plateforme d'analyse de donnees sociales pour agences. Collectez, analysez et surveillez les donnees Facebook avec l'IA. Essai gratuit."
        path="/"
        alternatePath="/en/"
        jsonLd={[
          organizationSchema(),
          softwareApplicationSchema(),
          faqSchema(faqItems),
        ]}
      />
      {/* ================================================================
          1. HERO SECTION
      ================================================================= */}
      <section className="relative w-full bg-navy overflow-hidden">
        {/* Decorative gold circles */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-gold/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 lg:pt-20 lg:pb-24">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gold/20 text-gold border border-gold/30 rounded-full text-sm font-semibold mb-8">
              <Zap className="w-4 h-4" />
              Social Media Analytics
            </div>

            {/* H1 */}
            <h1 className="font-display text-white text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Collectez, analysez et surveillez
              <span className="block text-gold">vos données sociales</span>
            </h1>

            {/* Subtitle */}
            <p className="text-steel-200 text-lg sm:text-xl max-w-3xl mx-auto mb-10 leading-relaxed">
              La plateforme tout-en-un pour transformer les données Facebook en
              avantage concurrentiel. Collecte automatique, analyse IA,
              benchmark et surveillance en temps réel.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-gold text-navy font-bold rounded-xl px-8 py-4 hover:bg-gold-300 transition shadow-lg text-lg"
              >
                Commencer gratuitement
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 border border-white/30 text-white rounded-xl px-8 py-4 hover:bg-white/10 transition text-lg"
              >
                Découvrir les fonctionnalités
              </a>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <p className="text-gold font-display text-3xl sm:text-4xl font-bold">
                  10 000+
                </p>
                <p className="text-steel-200 text-sm mt-1">
                  analyses réalisées
                </p>
              </div>
              <div className="text-center">
                <p className="text-gold font-display text-3xl sm:text-4xl font-bold">
                  99.9%
                </p>
                <p className="text-steel-200 text-sm mt-1">de fiabilité</p>
              </div>
              <div className="text-center">
                <p className="text-gold font-display text-3xl sm:text-4xl font-bold">
                  48h
                </p>
                <p className="text-steel-200 text-sm mt-1">support max</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          2. FEATURES SECTION
      ================================================================= */}
      <section id="features" className="w-full bg-cream-50 py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-navy text-3xl lg:text-4xl font-bold mb-4">
              Une plateforme, six superpouvoirs
            </h2>
            <p className="text-steel text-lg max-w-2xl mx-auto">
              Tout ce dont vous avez besoin pour exploiter les données Facebook
              de manière professionnelle.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feat) => (
              <div
                key={feat.title}
                className="bg-white rounded-2xl shadow border border-cream-300 p-8 hover:-translate-y-1 transition-transform duration-200"
              >
                <div className="w-12 h-12 bg-navy/10 rounded-xl flex items-center justify-center mb-5">
                  <feat.icon className="w-6 h-6 text-navy" />
                </div>
                <h3 className="font-display text-navy text-xl font-bold mb-3">
                  {feat.title}
                </h3>
                <p className="text-steel leading-relaxed mb-4">
                  {feat.description}
                </p>
                <span className="inline-block bg-gold/10 text-gold-700 text-xs px-3 py-1 rounded-full">
                  {feat.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          3. HOW IT WORKS
      ================================================================= */}
      <section className="w-full bg-white py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-navy text-3xl lg:text-4xl font-bold mb-4">
              Comment ça marche ?
            </h2>
            <p className="text-steel text-lg max-w-2xl mx-auto">
              De la collecte brute à l'insight stratégique en 4 étapes.
            </p>
          </div>

          <div className="relative grid md:grid-cols-4 gap-8 lg:gap-10">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-16 left-[12.5%] right-[12.5%] h-0.5 bg-cream-300" />

            {/* Step 1 */}
            <div className="text-center relative">
              <p className="text-gold font-display text-4xl font-bold mb-4">
                01
              </p>
              <div className="w-14 h-14 bg-navy rounded-full flex items-center justify-center mx-auto mb-5 relative z-10">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-display text-navy text-lg font-bold mb-2">
                Créez votre compte
              </h3>
              <p className="text-steel text-sm leading-relaxed">
                Inscription gratuite en 30 secondes. Recevez des crédits d'essai pour tester immédiatement.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center relative">
              <p className="text-gold font-display text-4xl font-bold mb-4">
                02
              </p>
              <div className="w-14 h-14 bg-navy rounded-full flex items-center justify-center mx-auto mb-5 relative z-10">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-display text-navy text-lg font-bold mb-2">
                Lancez vos analyses
              </h3>
              <p className="text-steel text-sm leading-relaxed">
                Marketplace, Pages Facebook, publications, commentaires — collez vos URLs et laissez la plateforme travailler.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center relative">
              <p className="text-gold font-display text-4xl font-bold mb-4">
                03
              </p>
              <div className="w-14 h-14 bg-gold rounded-full flex items-center justify-center mx-auto mb-5 relative z-10">
                <Sparkles className="w-6 h-6 text-navy" />
              </div>
              <h3 className="font-display text-navy text-lg font-bold mb-2">
                Analysez avec l'IA
              </h3>
              <p className="text-steel text-sm leading-relaxed">
                Notre IA décrypte vos données : tendances, benchmark concurrentiel, recommandations stratégiques personnalisées.
              </p>
            </div>

            {/* Step 4 */}
            <div className="text-center relative">
              <p className="text-gold font-display text-4xl font-bold mb-4">
                04
              </p>
              <div className="w-14 h-14 bg-navy rounded-full flex items-center justify-center mx-auto mb-5 relative z-10">
                <Download className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-display text-navy text-lg font-bold mb-2">
                Exploitez vos résultats
              </h3>
              <p className="text-steel text-sm leading-relaxed">
                Exportez en Excel, programmez des collectes récurrentes et recevez des alertes de mentions automatiques.
              </p>
            </div>
          </div>

          {/* Feature highlights strip */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: ShoppingBag, label: "Marketplace", desc: "Annonces, prix, vendeurs" },
              { icon: FileText, label: "Facebook Pages", desc: "Posts, engagement, stats" },
              { icon: TrendingUp, label: "Benchmark", desc: "Comparez vos concurrents" },
              { icon: Sparkles, label: "Analyse IA", desc: "Insights automatiques" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 bg-cream-50 border border-cream-300 rounded-xl p-4">
                <div className="w-10 h-10 bg-navy/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-navy" />
                </div>
                <div>
                  <p className="text-sm font-bold text-navy">{item.label}</p>
                  <p className="text-xs text-steel">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          4. USE CASES
      ================================================================= */}
      <section className="w-full bg-navy py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-white text-3xl lg:text-4xl font-bold mb-4">
              Conçu pour les professionnels qui comptent sur leurs données
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {useCases.map((uc) => (
              <div
                key={uc.title}
                className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 border-l-4 border-l-gold"
              >
                <uc.icon className="w-8 h-8 text-gold mb-5" />
                <h3 className="text-white font-bold text-lg mb-3">
                  {uc.title}
                </h3>
                <p className="text-steel-200 leading-relaxed mb-4 text-sm">
                  {uc.description}
                </p>
                <p className="text-gold/80 text-sm">{uc.audience}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          5. PRICING SECTION
      ================================================================= */}
      <section className="w-full bg-cream-50 py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-navy text-3xl lg:text-4xl font-bold mb-4">
              Des tarifs flexibles pour chaque besoin
            </h2>
            <p className="text-steel text-lg mb-6">
              Pas d'abonnement. Payez uniquement ce que vous utilisez.
            </p>
            <span className="inline-block bg-gold/20 text-gold-700 text-sm font-semibold px-4 py-2 rounded-full">
              Économisez jusqu'à 38% avec les gros volumes
            </span>
          </div>

          {loadingPacks ? (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 border-4 border-navy border-t-transparent rounded-full animate-spin" />
            </div>
          ) : packs.length > 0 ? (
            <div className="grid gap-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
              {packs.map((pack: any, idx: number) => {
                const isPopular = idx === 1 || pack.popular;
                return (
                  <div
                    key={pack.id || idx}
                    className={`relative bg-white rounded-2xl shadow p-6 flex flex-col ${
                      isPopular ? "border-2 border-gold ring-2 ring-gold/20" : "border border-cream-300"
                    }`}
                  >
                    {isPopular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-navy text-xs font-bold px-4 py-1 rounded-full">
                        Populaire
                      </span>
                    )}
                    <h3 className="font-display text-navy font-bold text-xl mb-2">
                      {pack.name}
                    </h3>
                    <p className="text-navy text-3xl font-bold mb-1">
                      {pack.price_label || (pack.price_eur ? `${(Number(pack.price_eur) / 100).toLocaleString('fr-FR')} €` : `${formatPrice(pack.price)} MGA`)}
                    </p>
                    <p className="text-steel text-sm mb-6">
                      {formatPrice(pack.nb_downloads)} analyses
                    </p>
                    <div className="mt-auto">
                      <Link
                        to="/pricing"
                        className="block w-full text-center bg-navy text-white font-semibold hover:bg-navy-400 rounded-xl py-3 transition"
                      >
                        Choisir ce pack
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-steel">
              Les tarifs seront disponibles prochainement.
            </p>
          )}
        </div>
      </section>

      {/* ================================================================
          6. TRUST SECTION
      ================================================================= */}
      <section className="w-full bg-white py-16 lg:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-navy text-3xl lg:text-4xl font-bold">
              Pourquoi nous faire confiance ?
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: "100% Sécurisé",
                description:
                  "Aucune donnée stockée. Chiffrement de bout en bout pour protéger vos recherches.",
              },
              {
                icon: TrendingUp,
                title: "99.9% Fiable",
                description:
                  "Infrastructure robuste qui traite des milliers de requêtes chaque jour.",
              },
              {
                icon: Users,
                title: "Support Expert",
                description:
                  "Équipe technique disponible sous 48h pour vous aider.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl p-8 border border-cream-300 text-center"
              >
                <div className="w-14 h-14 bg-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <item.icon className="w-7 h-7 text-gold" />
                </div>
                <h3 className="font-display text-navy text-xl font-bold mb-3">
                  {item.title}
                </h3>
                <p className="text-steel leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          7. FAQ
      ================================================================= */}
      <section id="faq" className="w-full bg-cream-50 py-16 lg:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-navy text-3xl lg:text-4xl font-bold">
              Questions fréquentes
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {faqItems.map((item) => (
              <div
                key={item.question}
                className="bg-white rounded-2xl p-8 border border-cream-300"
              >
                <h3 className="font-bold text-navy text-lg mb-3">
                  {item.question}
                </h3>
                <p className="text-steel leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          8. FINAL CTA
      ================================================================= */}
      <section className="relative w-full bg-navy overflow-hidden py-16 lg:py-20">
        {/* Decorative gold circles */}
        <div className="absolute top-10 right-20 w-64 h-64 bg-gold/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-20 w-80 h-80 bg-gold/5 rounded-full blur-3xl" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-white text-3xl lg:text-4xl font-bold mb-6">
            Prêt à transformer vos données sociales en avantage concurrentiel ?
          </h2>
          <p className="text-steel-200 text-lg mb-10 leading-relaxed">
            Rejoignez des centaines de professionnels qui utilisent Easy
            pour prendre de meilleures décisions, plus vite.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-gold text-navy font-bold rounded-xl px-8 py-4 hover:bg-gold-300 transition shadow-lg text-lg"
          >
            Commencer gratuitement
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-steel-200 text-sm mt-6">
            Inscription gratuite · Aucun engagement · Paiement sécurisé
          </p>
        </div>
      </section>

    </div>
  );
}
