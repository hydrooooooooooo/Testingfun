
import { Link, useLocation } from "react-router-dom";

const nav = [
  { path: "/", label: "Accueil" },
  { path: "/pricing", label: "Tarifs" },
  { path: "/support", label: "Support" }
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-20 w-full bg-white border-b border-border shadow-sm flex items-center px-8 h-20">
        <span className="text-2xl font-extrabold tracking-tight text-primary uppercase mr-8 select-none">
          easyscrapymg<span className="text-primary font-black">.com</span>
        </span>
        <nav className="flex gap-4 text-lg">
          {nav.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              className={`px-3 py-2 rounded transition-colors duration-150 ${
                pathname === path
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted/70 text-muted-foreground"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1 flex flex-col px-0">{children}</main>
      <footer className="border-t border-border py-3 mt-6 text-center text-xs text-muted-foreground tracking-wide">
        &copy; {new Date().getFullYear()} easyscrapymg.com &mdash; Tous droits réservés.
      </footer>
    </div>
  );
}
