import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/layout/Header';
import CollapsibleSidebar from '../components/layout/CollapsibleSidebar';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DashboardLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile sidebar toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden fixed bottom-4 left-4 z-50 bg-gold text-navy hover:bg-gold-500 shadow-lg rounded-full h-12 w-12"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Mobile overlay */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        {/* Sidebar - hidden on mobile unless toggled */}
        <div className={`
          fixed md:relative z-40 md:z-auto h-[calc(100vh-64px)] md:h-auto
          transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <CollapsibleSidebar
            isCollapsed={isCollapsed}
            setIsCollapsed={setIsCollapsed}
            onNavigate={() => setIsMobileOpen(false)}
          />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 sm:px-6 sm:py-4 md:gap-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
