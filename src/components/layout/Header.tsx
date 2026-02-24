import { useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Accueil' },
  { path: '/#features', label: 'Fonctionnalités' },
  { path: '/exemples', label: 'Exemples' },
  { path: '/pricing', label: 'Tarifs' },
  { path: '/support', label: 'Support' },
];

const Header = () => {
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  const isActive = (path: string) => {
    if (path === '/#features') return pathname === '/' && hash === '#features';
    if (path === '/') return pathname === '/' && hash !== '#features';
    return pathname === path;
  };

  const handleNavClick = useCallback((e: React.MouseEvent, path: string) => {
    if (path === '/#features') {
      e.preventDefault();
      if (pathname === '/') {
        document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
        window.history.replaceState(null, '', '/#features');
      } else {
        navigate('/');
        setTimeout(() => {
          document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [pathname, navigate]);

  return (
    <header className="sticky top-0 z-20 w-full bg-navy shadow-sm flex items-center justify-between px-4 md:px-8 h-20">
      <Link to="/" className="text-2xl font-extrabold tracking-tight mr-8 select-none">
        <span className="text-white">Easy</span>
        <span className="text-gold font-black ml-1 text-sm align-middle">Social Media Analytics</span>
      </Link>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-4 text-lg">
        {navItems.map(({ path, label }) => (
          <Link
            key={path}
            to={path}
            onClick={(e) => handleNavClick(e, path)}
            className={`px-3 py-2 rounded transition-colors duration-150 ${
              isActive(path)
                ? 'bg-gold text-navy font-semibold'
                : 'text-cream-200 hover:text-gold transition'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Desktop Auth Buttons */}
      <div className="hidden md:flex items-center gap-4 ml-auto">
        {isAuthenticated() ? (
          <>
            <span className="text-sm text-cream-200 hidden lg:inline">
              {user?.email}
            </span>
            <Link to="/dashboard">
              <Button variant="outline" className="border-cream-200 bg-transparent text-white hover:bg-white/10">
                Dashboard
              </Button>
            </Link>
            <Button onClick={logout} className="bg-gold text-navy hover:bg-gold-300 font-bold">
              Déconnexion
            </Button>
          </>
        ) : (
          <>
            <Link to="/login">
              <Button variant="outline" className="border-cream-200 bg-transparent text-white hover:bg-white/10">
                Se connecter
              </Button>
            </Link>
            <Link to="/register">
              <Button className="bg-gold text-navy hover:bg-gold-300 font-bold">
                Commencer
              </Button>
            </Link>
          </>
        )}
      </div>

      {/* Mobile Menu */}
      <div className="md:hidden ml-auto">
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Ouvrir le menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-navy border-navy-400">
            <nav className="grid gap-6 text-lg font-medium mt-10">
              {navItems.map(({ path, label }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={(e) => { handleNavClick(e, path); closeMenu(); }}
                  className="text-cream-200 hover:text-gold transition-colors"
                >
                  {label}
                </Link>
              ))}
              <hr className="my-4 border-navy-400" />
              {isAuthenticated() ? (
                <div className="flex flex-col gap-4">
                  <Link to="/dashboard" onClick={closeMenu}>
                    <Button variant="outline" className="w-full border-cream-200 bg-transparent text-white hover:bg-white/10">
                      Dashboard
                    </Button>
                  </Link>
                  <Button
                    onClick={() => { logout(); closeMenu(); }}
                    className="bg-gold text-navy hover:bg-gold-300 font-bold"
                  >
                    Déconnexion
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <Link to="/login" onClick={closeMenu}>
                    <Button variant="outline" className="w-full border-cream-200 bg-transparent text-white hover:bg-white/10">
                      Se connecter
                    </Button>
                  </Link>
                  <Link to="/register" onClick={closeMenu}>
                    <Button className="w-full bg-gold text-navy hover:bg-gold-300 font-bold">
                      Commencer
                    </Button>
                  </Link>
                </div>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Header;
