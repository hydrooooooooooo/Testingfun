import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/layout/Header';

const DashboardLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
