import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Database,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AdminSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onNavigate?: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isCollapsed, setIsCollapsed, onNavigate }) => {
  const location = useLocation();

  const menuItems = [
    {
      title: "Vue d'ensemble",
      icon: LayoutDashboard,
      href: '/admin',
      exact: true,
    },
    {
      title: 'Utilisateurs',
      icon: Users,
      href: '/admin/users',
    },
    {
      title: 'Sessions',
      icon: Database,
      href: '/admin/sessions',
    },
    {
      title: 'Reporting',
      icon: BarChart3,
      href: '/admin/reporting',
    },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  const MenuItem = ({ item }: { item: (typeof menuItems)[0] }) => {
    const Icon = item.icon;
    const active = isActive(item.href, item.exact);

    const content = (
      <Link
        to={item.href}
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
          active
            ? 'bg-gold text-navy font-semibold shadow-sm'
            : 'text-cream-300 hover:bg-white/10 hover:text-white'
        )}
      >
        <Icon className={cn('h-5 w-5 flex-shrink-0', active && 'text-navy')} />
        {!isCollapsed && <span className="flex-1 truncate">{item.title}</span>}
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="bg-navy text-white border-steel/30">
            {item.title}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full border-r border-steel/20 bg-navy transition-all duration-300 ease-in-out relative shadow-sm',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          'absolute -right-3 top-6 z-50 h-6 w-6 rounded-full border border-steel/30 bg-navy shadow-md hover:bg-steel/30 text-cream-300',
          'hidden md:flex'
        )}
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>

      {/* Header */}
      <div className={cn('border-b border-steel/20 p-4', isCollapsed && 'p-2 items-center')}>
        {!isCollapsed ? (
          <div className="flex items-center gap-2 px-2">
            <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center">
              <span className="text-navy font-bold text-sm">AD</span>
            </div>
            <div>
              <div className="text-sm font-bold text-white">Administration</div>
              <div className="text-xs text-cream-300">EasyScrapy</div>
            </div>
          </div>
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="flex justify-center">
                <div className="w-10 h-10 rounded-lg bg-gold flex items-center justify-center">
                  <span className="text-navy font-bold">AD</span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-navy text-white border-steel/30">
              Administration
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn('flex-1 space-y-1 p-3 overflow-y-auto', isCollapsed && 'p-2')}>
        {menuItems.map((item) => (
          <MenuItem key={item.href} item={item} />
        ))}
      </nav>

      {/* Footer - Back to dashboard */}
      <div className={cn('border-t border-steel/20 p-3', isCollapsed && 'p-2')}>
        {!isCollapsed ? (
          <Link
            to="/dashboard"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-cream-300 hover:bg-white/10 hover:text-white transition-all"
          >
            <ArrowLeft className="h-5 w-5 flex-shrink-0" />
            <span>Retour au dashboard</span>
          </Link>
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                to="/dashboard"
                onClick={onNavigate}
                className="flex items-center justify-center rounded-lg px-3 py-2.5 text-cream-300 hover:bg-white/10 hover:text-white transition-all"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-navy text-white border-steel/30">
              Retour au dashboard
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default AdminSidebar;
