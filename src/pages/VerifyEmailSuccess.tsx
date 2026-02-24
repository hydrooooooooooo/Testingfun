import { Link } from 'react-router-dom';
import {
  CheckCircle, ArrowRight, ShoppingBag, TrendingUp,
  Sparkles, Shield, Home
} from 'lucide-react';

export default function VerifyEmailSuccess() {
  const benefits = [
    { icon: ShoppingBag, text: 'Analyse Marketplace en 3 min' },
    { icon: TrendingUp, text: 'Benchmark concurrentiel automatisé' },
    { icon: Sparkles, text: 'Analyses IA de vos données' },
    { icon: Shield, text: 'Données sécurisées, jamais stockées' },
  ];

  return (
    <div className="flex min-h-[calc(100vh-80px)] w-full">
      {/* ─── LEFT BRANDING PANEL (desktop only) ─── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] relative bg-navy overflow-hidden flex-col justify-between p-10 xl:p-14">
        <div className="absolute top-16 -left-20 w-72 h-72 bg-gold/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-gold/8 rounded-full blur-2xl" />

        <div className="relative z-10">
          <Link to="/" className="inline-block mb-14">
            <span className="text-white text-2xl font-bold font-display">
              Easy
              <span className="text-gold">.COM</span>
            </span>
          </Link>

          <h1 className="font-display text-white text-3xl xl:text-4xl font-bold leading-tight mb-4">
            Tout est prêt,
            <span className="block text-gold mt-1">à vous de jouer</span>
          </h1>
          <p className="text-steel-200 text-base leading-relaxed max-w-md">
            Votre compte est vérifié et opérationnel. Connectez-vous pour découvrir vos outils d'intelligence sociale.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {benefits.map((b, i) => (
            <div
              key={i}
              className="flex items-center gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-3.5"
            >
              <div className="w-9 h-9 bg-gold/15 rounded-lg flex items-center justify-center flex-shrink-0">
                <b.icon className="w-[18px] h-[18px] text-gold" />
              </div>
              <span className="text-cream-200 text-sm font-medium">{b.text}</span>
            </div>
          ))}
        </div>

        <p className="relative z-10 text-steel-200 text-xs">
          Plateforme d'intelligence sociale &middot; Depuis Madagascar
        </p>
      </div>

      {/* ─── RIGHT CONTENT PANEL ─── */}
      <div className="flex-1 flex flex-col bg-cream-50">
        {/* Mobile branding header */}
        <div className="lg:hidden bg-navy px-6 py-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gold/10 rounded-full blur-3xl" />
          <div className="relative z-10 text-center">
            <Link to="/" className="inline-block mb-3">
              <span className="text-white text-xl font-bold font-display">
                Easy
                <span className="text-gold">.COM</span>
              </span>
            </Link>
            <h1 className="font-display text-white text-xl font-bold">
              E-mail vérifié
            </h1>
            <p className="text-steel-200 text-sm mt-1">
              Votre compte est prêt
            </p>
          </div>
        </div>

        {/* Content container */}
        <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-8 sm:py-12">
          <div className="w-full max-w-md text-center">
            {/* Success icon */}
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>

            <h2 className="font-display text-navy text-2xl font-bold mb-3">
              E-mail vérifié avec succès
            </h2>
            <p className="text-steel text-sm leading-relaxed mb-8 max-w-sm mx-auto">
              Votre adresse e-mail a été confirmée. Vous pouvez maintenant vous connecter et profiter de toutes les fonctionnalités d'Easy.
            </p>

            {/* CTA buttons */}
            <div className="space-y-3">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 w-full h-12 bg-gold text-navy font-bold hover:bg-gold-300 transition-all shadow-md hover:shadow-lg rounded-xl text-[15px]"
              >
                Se connecter
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/"
                className="flex items-center justify-center gap-2 w-full h-11 bg-transparent border border-cream-300 text-navy font-semibold hover:bg-cream-200 transition-all rounded-xl text-sm"
              >
                <Home className="w-4 h-4" />
                Retour à l'accueil
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
