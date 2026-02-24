import { useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/hooks/useLocale';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

const Header = () => {
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const { locale, t, pathPrefix, switchLocalePath } = useLocale();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const homePath = `${pathPrefix}/`;
  const featuresPath = `${pathPrefix}/#features`;

  const navItems = [
    { path: homePath, label: t.nav.home },
    { path: featuresPath, label: t.nav.features },
    { path: locale === 'fr' ? '/exemples' : '/en/examples', label: t.nav.examples },
    { path: `${pathPrefix}/pricing`, label: t.nav.pricing },
    { path: `${pathPrefix}/support`, label: t.nav.support },
  ];

  const closeMenu = () => setIsMenuOpen(false);

  const isActive = (path: string) => {
    if (path === featuresPath) return pathname === homePath && hash === '#features';
    if (path === homePath) return pathname === homePath && hash !== '#features';
    return pathname === path;
  };

  const handleNavClick = useCallback((e: React.MouseEvent, path: string) => {
    if (path === featuresPath) {
      e.preventDefault();
      if (pathname === homePath) {
        document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
        window.history.replaceState(null, '', featuresPath);
      } else {
        navigate(homePath);
        setTimeout(() => {
          document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [pathname, navigate, homePath, featuresPath]);

  return (
    <header className="sticky top-0 z-20 w-full bg-navy shadow-sm flex items-center justify-between px-4 md:px-8 h-20">
      <Link to={homePath} className="text-2xl font-extrabold tracking-tight mr-8 select-none">
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
        <Link
          to={switchLocalePath(pathname)}
          className="text-cream-200 hover:text-gold text-sm font-semibold border border-cream-200/30 rounded px-2 py-1 transition"
        >
          {locale === 'fr' ? 'EN' : 'FR'}
        </Link>
        {isAuthenticated() ? (
          <>
            <span className="text-sm text-cream-200 hidden lg:inline">
              {user?.email}
            </span>
            <Link to="/dashboard">
              <Button variant="outline" className="border-cream-200 bg-transparent text-white hover:bg-white/10">
                {t.nav.dashboard}
              </Button>
            </Link>
            <Button onClick={logout} className="bg-gold text-navy hover:bg-gold-300 font-bold">
              {t.nav.logout}
            </Button>
          </>
        ) : (
          <>
            <Link to={`${pathPrefix}/login`}>
              <Button variant="outline" className="border-cream-200 bg-transparent text-white hover:bg-white/10">
                {t.nav.login}
              </Button>
            </Link>
            <Link to={`${pathPrefix}/register`}>
              <Button className="bg-gold text-navy hover:bg-gold-300 font-bold">
                {t.nav.register}
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
              <Link
                to={switchLocalePath(pathname)}
                onClick={closeMenu}
                className="text-cream-200 hover:text-gold text-sm font-semibold border border-cream-200/30 rounded px-2 py-1 transition w-fit"
              >
                {locale === 'fr' ? 'EN' : 'FR'}
              </Link>
              <hr className="my-4 border-navy-400" />
              {isAuthenticated() ? (
                <div className="flex flex-col gap-4">
                  <Link to="/dashboard" onClick={closeMenu}>
                    <Button variant="outline" className="w-full border-cream-200 bg-transparent text-white hover:bg-white/10">
                      {t.nav.dashboard}
                    </Button>
                  </Link>
                  <Button
                    onClick={() => { logout(); closeMenu(); }}
                    className="bg-gold text-navy hover:bg-gold-300 font-bold"
                  >
                    {t.nav.logout}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <Link to={`${pathPrefix}/login`} onClick={closeMenu}>
                    <Button variant="outline" className="w-full border-cream-200 bg-transparent text-white hover:bg-white/10">
                      {t.nav.login}
                    </Button>
                  </Link>
                  <Link to={`${pathPrefix}/register`} onClick={closeMenu}>
                    <Button className="w-full bg-gold text-navy hover:bg-gold-300 font-bold">
                      {t.nav.register}
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
