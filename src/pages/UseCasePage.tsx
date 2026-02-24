import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowRight, CheckCircle } from 'lucide-react';
import SEOHead from '@/components/seo/SEOHead';
import { useLocale } from '@/hooks/useLocale';
import { findUseCase, useCases } from '@/data/useCases';
import { breadcrumbSchema } from '@/components/seo/schemas';

export default function UseCasePage() {
  const { slug } = useParams<{ slug: string }>();
  const { locale } = useLocale();
  const isFr = locale === 'fr';

  const uc = slug ? findUseCase(slug) : undefined;
  if (!uc) return <Navigate to="/" replace />;

  const title = isFr ? uc.titleFr : uc.titleEn;
  const desc = isFr ? uc.descFr : uc.descEn;
  const heroSub = isFr ? uc.heroSubFr : uc.heroSubEn;
  const problem = isFr ? uc.problemFr : uc.problemEn;
  const solution = isFr ? uc.solutionFr : uc.solutionEn;
  const result = isFr ? uc.resultFr : uc.resultEn;
  const audience = isFr ? uc.audienceFr : uc.audienceEn;
  const pathFr = `/use-cases/${uc.slugFr}`;
  const pathEn = `/en/use-cases/${uc.slugEn}`;

  const breadcrumbs = [
    { name: isFr ? 'Accueil' : 'Home', url: isFr ? '/' : '/en/' },
    { name: isFr ? "Cas d'usage" : 'Use cases', url: isFr ? '/exemples' : '/en/examples' },
    { name: title, url: isFr ? pathFr : pathEn },
  ];

  const related = useCases.filter((u) => u.slugFr !== uc.slugFr).slice(0, 3);

  return (
    <div className="min-h-[calc(100vh-80px)] bg-cream-50">
      <SEOHead
        title={`${title} — ${isFr ? "Cas d'usage" : 'Use case'}`}
        description={desc}
        path={isFr ? pathFr : pathEn}
        locale={isFr ? 'fr_FR' : 'en_US'}
        alternatePath={isFr ? pathEn : pathFr}
        jsonLd={[breadcrumbSchema(breadcrumbs)]}
      />

      {/* Hero */}
      <section className="relative w-full bg-navy overflow-hidden">
        <div className="absolute top-10 right-20 w-80 h-80 bg-gold/10 rounded-full blur-3xl" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20 text-center">
          <div className="w-14 h-14 bg-gold/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <uc.icon className="w-7 h-7 text-gold" />
          </div>
          <h1 className="font-display text-white text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-5">
            {title}
          </h1>
          <p className="text-steel text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            {heroSub}
          </p>
          <p className="text-gold/80 text-sm mt-4">{audience}</p>
        </div>
      </section>

      {/* Problem */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="font-display text-navy text-2xl font-bold mb-4">
          {isFr ? 'Le probleme' : 'The problem'}
        </h2>
        <p className="text-steel text-lg leading-relaxed">{problem}</p>
      </section>

      {/* Solution */}
      <section className="w-full bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-navy text-2xl font-bold mb-8">
            {isFr ? 'La solution Easy' : 'The Easy solution'}
          </h2>
          <div className="space-y-4">
            {solution.map((step, i) => (
              <div key={i} className="flex items-start gap-4 bg-cream-50 rounded-xl p-5 border border-cream-300">
                <CheckCircle className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
                <p className="text-navy leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Result */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="font-display text-navy text-2xl font-bold mb-4">
          {isFr ? 'Le resultat' : 'The result'}
        </h2>
        <div className="bg-gold/10 border border-gold/20 rounded-xl p-6">
          <p className="text-navy text-lg font-medium leading-relaxed">{result}</p>
        </div>
      </section>

      {/* Related use cases */}
      <section className="w-full bg-white py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-navy text-2xl font-bold mb-8 text-center">
            {isFr ? "Autres cas d'usage" : 'Other use cases'}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {related.map((r) => (
              <Link
                key={r.slugFr}
                to={isFr ? `/use-cases/${r.slugFr}` : `/en/use-cases/${r.slugEn}`}
                className="bg-cream-50 rounded-xl border border-cream-300 p-6 hover:shadow-md transition-shadow"
              >
                <r.icon className="w-6 h-6 text-gold mb-3" />
                <h3 className="text-navy font-bold mb-2">{isFr ? r.titleFr : r.titleEn}</h3>
                <p className="text-steel text-sm">{isFr ? r.descFr : r.descEn}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative w-full bg-navy overflow-hidden py-12 lg:py-16">
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-display text-white text-2xl sm:text-3xl font-bold mb-4">
            {isFr ? 'Pret a transformer vos donnees ?' : 'Ready to transform your data?'}
          </h2>
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
