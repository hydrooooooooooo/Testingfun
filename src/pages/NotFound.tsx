import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import SEOHead from '@/components/seo/SEOHead';

export default function NotFound() {
  const location = useLocation();

  useEffect(() => {
    console.error('404 Error:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-cream-50">
      <SEOHead title="Page introuvable" description="La page demandee n'existe pas." path="/404" noindex />
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold text-navy mb-4">404</h1>
        <p className="text-xl text-steel mb-6">Cette page n'existe pas ou a ete deplacee.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-gold text-navy font-bold rounded-xl px-6 py-3 hover:bg-gold/80 transition"
        >
          Retour a l'accueil
        </Link>
      </div>
    </div>
  );
}
