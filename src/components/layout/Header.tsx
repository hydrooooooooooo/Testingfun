import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Accueil' },
  { path: '/pricing', label: 'Tarifs' },
  { path: '/support', label: 'Support' },
  { path: '/models', label: 'Modèles' },
];

const Header = () => {
  const { pathname } = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="sticky top-0 z-20 w-full bg-white border-b border-border shadow-sm flex items-center justify-between px-4 md:px-8 h-20">
      <Link to="/" className="text-2xl font-extrabold tracking-tight text-primary uppercase mr-8 select-none">
        EASYSCrapy<span className="text-primary font-black">.COM</span>
      </Link>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-4 text-lg">
        {navItems.map(({ path, label }) => (
          <Link
            key={path}
            to={path}
            className={`px-3 py-2 rounded transition-colors duration-150 ${
              pathname === path
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted/70 text-muted-foreground'
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
            <span className="text-sm text-muted-foreground hidden lg:inline">
              {user?.email}
            </span>
            <Link to="/dashboard">
              <Button variant="outline">Dashboard</Button>
            </Link>
            <Button onClick={logout}>Déconnexion</Button>
          </>
        ) : (
          <Link to="/login">
            <Button>Se connecter</Button>
          </Link>
        )}
      </div>

      {/* Mobile Menu */}
      <div className="md:hidden ml-auto">
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Ouvrir le menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <nav className="grid gap-6 text-lg font-medium mt-10">
              {navItems.map(({ path, label }) => (
                <Link key={path} to={path} onClick={closeMenu} className="hover:text-primary transition-colors">
                  {label}
                </Link>
              ))}
              <hr className="my-4" />
              {isAuthenticated() ? (
                <div className="flex flex-col gap-4">
                  <Link to="/dashboard" onClick={closeMenu}>
                    <Button variant="outline" className="w-full">Dashboard</Button>
                  </Link>
                  <Button onClick={() => { logout(); closeMenu(); }}>Déconnexion</Button>
                </div>
              ) : (
                <Link to="/login" onClick={closeMenu}>
                  <Button className="w-full">Se connecter</Button>
                </Link>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Header;
