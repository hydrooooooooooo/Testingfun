import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/layout/Header';
import AdminSidebar from '../components/layout/AdminSidebar';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AdminLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <Header />
      <div className="flex flex-1 min-h-0">
        {/* Mobile sidebar toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden fixed bottom-4 left-4 z-50 bg-gold text-navy hover:bg-gold/80 shadow-lg rounded-full h-12 w-12"
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

        {/* Sidebar */}
        <div className={`
          fixed md:relative z-40 md:z-auto h-[calc(100vh-80px)] md:h-full flex-shrink-0
          transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <AdminSidebar
            isCollapsed={isCollapsed}
            setIsCollapsed={setIsCollapsed}
            onNavigate={() => setIsMobileOpen(false)}
          />
        </div>

        {/* Main content - only this scrolls */}
        <main className="flex-1 overflow-y-auto bg-cream-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
