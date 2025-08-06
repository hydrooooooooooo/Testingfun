
import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/layout/Header';

const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col px-0">
        <Outlet />
      </main>
      <footer className="border-t border-border py-3 mt-6 text-center text-xs text-muted-foreground tracking-wide">
        &copy; {new Date().getFullYear()} easyscrapy.com &mdash; Tous droits réservés.
      </footer>
    </div>
  );
};

export default PublicLayout;
