import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-cream text-navy">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Admin</h1>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/dashboard" className="text-steel hover:text-navy">Dashboard</Link>
            <Link to="/admin" className="text-navy font-medium">Reporting</Link>
            <Link to="/profile" className="text-steel hover:text-navy">Profile</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
