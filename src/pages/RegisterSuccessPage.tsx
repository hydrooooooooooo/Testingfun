import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Mail, CheckCircle, Timer, ArrowRight, ShoppingBag,
  TrendingUp, Sparkles, Shield, PartyPopper
} from 'lucide-react';

export default function RegisterSuccessPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleResendEmail = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setCountdown(60);
        setCanResend(false);
      }
    } catch (error) {
      console.error('Erreur lors du renvoi de l\'email:', error);
    }
  };

  const steps = [
    { text: 'Consultez votre boîte de réception' },
    { text: 'Cliquez sur le lien de vérification dans l\'e-mail' },
    { text: 'Connectez-vous avec vos identifiants' },
  ];

  const benefits = [
    { icon: ShoppingBag, text: 'Extraction Marketplace en 3 min' },
    { icon: TrendingUp, text: 'Benchmark concurrentiel automatisé' },
    { icon: Sparkles, text: 'Analyses IA de vos données' },
    { icon: Shield, text: 'Données sécurisées, jamais stockées' },
  ];

  return (
    <div className="flex min-h-[calc(100vh-80px)] w-full">
      {/* ─── LEFT BRANDING PANEL (desktop only) ─── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] relative bg-navy overflow-hidden flex-col justify-between p-10 xl:p-14">
        {/* Decorative circles */}
        <div className="absolute top-16 -left-20 w-72 h-72 bg-gold/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-gold/8 rounded-full blur-2xl" />

        {/* Top content */}
        <div className="relative z-10">
          <Link to="/" className="inline-block mb-14">
            <span className="text-white text-2xl font-bold font-display">
              EASY<span className="text-gold">SCRAPY</span>
              <span className="text-gold">.COM</span>
            </span>
          </Link>

          <h1 className="font-display text-white text-3xl xl:text-4xl font-bold leading-tight mb-4">
            Bienvenue dans la
            <span className="block text-gold mt-1">communauté EasyScrapy</span>
          </h1>
          <p className="text-steel-200 text-base leading-relaxed max-w-md">
            Votre compte est presque prêt. Plus qu'une étape pour accéder à tous vos outils d'intelligence sociale.
          </p>
        </div>

        {/* Benefits list */}
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

        {/* Bottom text */}
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
                EASY<span className="text-gold">SCRAPY</span>
                <span className="text-gold">.COM</span>
              </span>
            </Link>
            <h1 className="font-display text-white text-xl font-bold">
              Inscription réussie !
            </h1>
            <p className="text-steel-200 text-sm mt-1">
              Vérifiez votre e-mail pour continuer
            </p>
          </div>
        </div>

        {/* Content container */}
        <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-8 sm:py-12">
          <div className="w-full max-w-md">
            {/* Success icon + heading (desktop) */}
            <div className="hidden lg:block text-center mb-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <PartyPopper className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="font-display text-navy text-2xl font-bold mb-2">
                Inscription réussie !
              </h2>
              <p className="text-steel text-sm">
                Votre compte a été créé avec succès
              </p>
            </div>

            {/* Email verification card */}
            <div className="bg-white border border-cream-300 rounded-xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gold/15 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Mail className="w-5 h-5 text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-navy text-[15px] mb-1">
                    Vérifiez votre adresse e-mail
                  </h3>
                  <p className="text-steel text-sm mb-2">
                    Un e-mail de vérification a été envoyé à :
                  </p>
                  {email && (
                    <p className="text-sm font-mono font-semibold text-navy bg-cream-50 border border-cream-300 px-3 py-1.5 rounded-lg truncate">
                      {email}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Steps checklist */}
            <div className="space-y-3 mb-6">
              <p className="text-navy font-semibold text-[13px] uppercase tracking-wide">
                Prochaines étapes
              </p>
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <span className="text-steel text-sm">{step.text}</span>
                </div>
              ))}
            </div>

            {/* Resend section */}
            <div className="border-t border-cream-300 pt-6 mb-4">
              <p className="text-steel text-sm mb-3">
                Vous n'avez pas reçu l'e-mail ?
              </p>

              {!canResend && (
                <div className="flex items-center gap-3 bg-gold/10 border border-gold/30 rounded-xl px-4 py-3 mb-3">
                  <Timer className="w-4 h-4 text-gold flex-shrink-0" />
                  <p className="text-navy text-[13px]">
                    Vous pourrez renvoyer dans <span className="font-bold">{countdown}s</span>
                  </p>
                </div>
              )}

              <Button
                variant="outline"
                onClick={handleResendEmail}
                disabled={!canResend}
                className="w-full h-11 bg-transparent border-cream-300 text-navy font-semibold hover:bg-cream-200 rounded-xl disabled:opacity-50"
              >
                {canResend
                  ? 'Renvoyer l\'e-mail de vérification'
                  : `Patientez ${countdown}s`
                }
              </Button>
              <p className="text-[11px] text-steel text-center mt-2">
                Pensez à vérifier votre dossier spam / courrier indésirable
              </p>
            </div>

            {/* Go to login */}
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 w-full h-12 bg-gold text-navy font-bold hover:bg-gold-300 transition-all shadow-md hover:shadow-lg rounded-xl text-[15px]"
            >
              Aller à la connexion
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
