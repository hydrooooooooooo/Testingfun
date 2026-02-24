import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="w-full bg-navy-900 border-t border-navy-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand column */}
          <div>
            <p className="text-white text-2xl font-bold mb-3">
              Easy<span className="text-gold">Scrapy</span>
              <span className="text-gold">.com</span>
            </p>
            <p className="text-steel-200 text-sm leading-relaxed">
              Intelligence sociale pour les professionnels
            </p>
          </div>

          {/* Produit */}
          <div>
            <h4 className="text-white font-bold mb-4">Produit</h4>
            <ul className="space-y-3">
              {[
                { label: 'Extraction Marketplace', href: '/#features' },
                { label: 'Facebook Pages', href: '/#features' },
                { label: 'Benchmark', href: '/#features' },
                { label: 'Analyses IA', href: '/#features' },
                { label: 'Automatisations', href: '/#features' },
                { label: 'Surveillance', href: '/#features' },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-steel-200 hover:text-gold transition text-sm">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Ressources */}
          <div>
            <h4 className="text-white font-bold mb-4">Ressources</h4>
            <ul className="space-y-3">
              <li><Link to="/pricing" className="text-steel-200 hover:text-gold transition text-sm">Tarifs</Link></li>
              <li><Link to="/exemples" className="text-steel-200 hover:text-gold transition text-sm">Exemples</Link></li>
              <li><Link to="/support" className="text-steel-200 hover:text-gold transition text-sm">Support</Link></li>
              <li><Link to="/about" className="text-steel-200 hover:text-gold transition text-sm">A propos</Link></li>
              <li><a href="/#faq" className="text-steel-200 hover:text-gold transition text-sm">FAQ</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-bold mb-4">Legal</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-steel-200 hover:text-gold transition text-sm">Conditions d'utilisation</a></li>
              <li><a href="#" className="text-steel-200 hover:text-gold transition text-sm">Politique de confidentialite</a></li>
              <li><a href="#" className="text-steel-200 hover:text-gold transition text-sm">Mentions legales</a></li>
            </ul>

            {/* Use cases links — SEO juice */}
            <h4 className="text-white font-bold mb-4 mt-8">Cas d'usage</h4>
            <ul className="space-y-3">
              <li><Link to="/use-cases/immobilier" className="text-steel-200 hover:text-gold transition text-sm">Immobilier</Link></li>
              <li><Link to="/use-cases/e-commerce" className="text-steel-200 hover:text-gold transition text-sm">E-commerce</Link></li>
              <li><Link to="/use-cases/automobile" className="text-steel-200 hover:text-gold transition text-sm">Automobile</Link></li>
              <li><Link to="/use-cases/etudes-de-marche" className="text-steel-200 hover:text-gold transition text-sm">Etudes de marche</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-navy-700 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-steel-200 text-sm">
            &copy; {new Date().getFullYear()} Easy &mdash; Tous droits reserves
          </p>
          <p className="text-steel-200 text-sm">
            Fait avec passion depuis Madagascar
          </p>
        </div>
      </div>
    </footer>
  );
}
