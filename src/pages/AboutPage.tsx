import { Link } from 'react-router-dom';
import { ArrowRight, Globe, Shield, Zap, Users, Target, Heart } from 'lucide-react';
import SEOHead from '@/components/seo/SEOHead';
import { useLocale } from '@/hooks/useLocale';
import { organizationSchema } from '@/components/seo/schemas';

export default function AboutPage() {
  const { locale, t } = useLocale();
  const isFr = locale === 'fr';

  return (
    <div className="min-h-[calc(100vh-80px)] bg-cream-50">
      <SEOHead
        title={t.seo.about_title}
        description={t.seo.about_desc}
        path={isFr ? '/about' : '/en/about'}
        locale={isFr ? 'fr_FR' : 'en_US'}
        alternatePath={isFr ? '/en/about' : '/about'}
        jsonLd={[organizationSchema()]}
      />

      {/* Hero */}
      <section className="relative w-full bg-navy overflow-hidden">
        <div className="absolute top-10 right-20 w-80 h-80 bg-gold/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 left-10 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20 text-center">
          <p className="text-gold text-xs font-semibold uppercase tracking-widest mb-4">
            {isFr ? 'A propos' : 'About us'}
          </p>
          <h1 className="font-display text-white text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-5">
            {isFr ? 'La donnee sociale,' : 'Social data,'}
            <span className="block text-gold mt-1">
              {isFr ? 'simplifiee.' : 'simplified.'}
            </span>
          </h1>
          <p className="text-steel text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            {isFr
              ? "Easy est ne d'un constat simple : les agences perdent des heures a collecter manuellement des donnees sur les reseaux sociaux. Nous avons cree la solution."
              : "Easy was born from a simple observation: agencies waste hours manually collecting social media data. We built the solution."}
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-display text-navy text-2xl sm:text-3xl font-bold mb-6">
              {isFr ? 'Notre mission' : 'Our mission'}
            </h2>
            <p className="text-steel leading-relaxed mb-4">
              {isFr
                ? "Donner aux agences et professionnels les outils pour transformer les donnees Facebook en decisions strategiques, sans competences techniques."
                : "Give agencies and professionals the tools to turn Facebook data into strategic decisions, without technical skills."}
            </p>
            <p className="text-steel leading-relaxed">
              {isFr
                ? "Depuis Madagascar, nous servons des clients en France, en Afrique francophone et a l'international. Notre equipe combine expertise data, IA et connaissance du terrain."
                : "From Madagascar, we serve clients in France, French-speaking Africa and internationally. Our team combines data expertise, AI and local market knowledge."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Globe, label: isFr ? 'International' : 'International', desc: isFr ? 'Clients dans 10+ pays' : 'Clients in 10+ countries' },
              { icon: Shield, label: isFr ? '100% Securise' : '100% Secure', desc: isFr ? 'Aucune donnee stockee' : 'No data stored' },
              { icon: Zap, label: isFr ? 'Rapide' : 'Fast', desc: isFr ? 'Resultats en minutes' : 'Results in minutes' },
              { icon: Users, label: isFr ? 'Support expert' : 'Expert support', desc: isFr ? 'Reponse sous 48h' : 'Response within 48h' },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-xl border border-cream-300 p-5 text-center">
                <item.icon className="w-6 h-6 text-gold mx-auto mb-3" />
                <h3 className="text-navy font-bold text-sm mb-1">{item.label}</h3>
                <p className="text-steel text-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="w-full bg-white py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-navy text-2xl sm:text-3xl font-bold text-center mb-12">
            {isFr ? 'Nos valeurs' : 'Our values'}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Target, title: isFr ? 'Simplicite' : 'Simplicity', desc: isFr ? "Des outils puissants, accessibles a tous. Pas besoin d'etre data scientist." : 'Powerful tools, accessible to all. No data science degree needed.' },
              { icon: Shield, title: isFr ? 'Transparence' : 'Transparency', desc: isFr ? "Pas d'abonnement cache, pas de donnees stockees. Vous payez ce que vous utilisez." : 'No hidden subscriptions, no stored data. You pay for what you use.' },
              { icon: Heart, title: isFr ? 'Impact local' : 'Local impact', desc: isFr ? 'Une equipe basee a Madagascar qui cree de la valeur pour les professionnels du monde entier.' : 'A team based in Madagascar creating value for professionals worldwide.' },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className="w-12 h-12 bg-gold/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-gold" />
                </div>
                <h3 className="text-navy font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-steel text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative w-full bg-navy overflow-hidden py-12 lg:py-16">
        <div className="absolute top-0 right-0 w-72 h-72 bg-gold/10 rounded-full blur-3xl" />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-display text-white text-2xl sm:text-3xl font-bold mb-4">
            {isFr ? 'Pret a essayer ?' : 'Ready to try?'}
          </h2>
          <p className="text-steel text-base mb-8">
            {isFr
              ? "Creez votre compte gratuit et decouvrez la puissance de l'analyse de donnees sociales."
              : 'Create your free account and discover the power of social data analytics.'}
          </p>
          <Link
            to={isFr ? '/register' : '/en/register'}
            className="inline-flex items-center gap-2 bg-gold text-navy font-bold rounded-xl px-8 py-4 hover:bg-gold/80 transition shadow-lg text-lg"
          >
            {isFr ? 'Commencer gratuitement' : 'Start for free'}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
