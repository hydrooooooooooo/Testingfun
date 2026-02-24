import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  CreditCard,
  Settings,
  LogOut,
  Coins,
  Sparkles,
  FolderOpen,
  Bell,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Menu,
  Calendar,
  Shield
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUnreadAlerts } from '@/hooks/useUnreadAlerts';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CreditBadge } from '@/components/CreditBadge';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface CollapsibleSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onNavigate?: () => void;
}

const CollapsibleSidebar: React.FC<CollapsibleSidebarProps> = ({ isCollapsed, setIsCollapsed, onNavigate }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { unreadCount } = useUnreadAlerts();

  const menuItems = [
    {
      title: 'Vue d\'ensemble',
      icon: LayoutDashboard,
      href: '/dashboard',
      exact: true
    },
    {
      title: 'Mes Crédits',
      icon: Coins,
      href: '/dashboard/credits',
    },
    {
      title: 'Mes Extractions',
      icon: FolderOpen,
      href: '/dashboard/extractions',
    },
    {
      title: 'Analyses IA',
      icon: Sparkles,
      href: '/dashboard/ai-analyses',
      badge: 'IA',
      badgeColor: 'bg-gold/20 text-gold'
    },
    {
      title: 'Benchmark',
      icon: TrendingUp,
      href: '/dashboard/benchmark',
    },
    {
      title: 'Automatisations',
      icon: Calendar,
      href: '/dashboard/automations',
    },
    {
      title: 'Surveillance',
      icon: Bell,
      href: '/dashboard/mentions',
      ...(unreadCount > 0 ? { badge: String(unreadCount), badgeColor: 'bg-red-500 text-white' } : {}),
    },
    {
      title: 'Paiements',
      icon: CreditCard,
      href: '/dashboard/payments',
    },
    {
      title: 'Paramètres',
      icon: Settings,
      href: '/dashboard/settings',
    },
    // Admin link — only shown for admin users (filtered below)
    ...(user?.role === 'admin' ? [{
      title: 'Administration',
      icon: Shield,
      href: '/admin',
      badge: 'Admin',
      badgeColor: 'bg-red-500/20 text-red-300'
    }] : []),
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const MenuItem = ({ item }: { item: any }) => {
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
            : 'text-cream-300 hover:bg-navy-400 hover:text-white'
        )}
      >
        <Icon className={cn("h-5 w-5 flex-shrink-0", active && "text-navy")} />
        {!isCollapsed && (
          <>
            <span className="flex-1 truncate">{item.title}</span>
            {item.badge && (
              <Badge className={cn(
                'text-[10px] px-1.5 py-0 h-4 border-0 text-white flex-shrink-0',
                item.badgeColor || 'bg-gold/20 text-gold'
              )}>
                {item.badge}
              </Badge>
            )}
          </>
        )}
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2 bg-navy-700 text-white border-navy-400">
            {item.title}
            {item.badge && (
              <Badge className={cn(
                'text-[10px] px-1.5 py-0 h-4 border-0 text-white',
                item.badgeColor || 'bg-primary'
              )}>
                {item.badge}
              </Badge>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <div className={cn(
      "flex flex-col h-full border-r border-navy-400 bg-navy transition-all duration-300 ease-in-out relative shadow-sm",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "absolute -right-3 top-6 z-50 h-6 w-6 rounded-full border border-navy-400 bg-navy-700 shadow-md hover:bg-navy-600 text-cream-300",
          "hidden md:flex"
        )}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      {/* Header */}
      <div className={cn(
        "border-b border-navy-400 p-4 space-y-4",
        isCollapsed && "p-2 items-center"
      )}>
        {/* Logo / Brand */}
        {!isCollapsed ? (
          <div className="flex items-center gap-2 px-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-gold-500 flex items-center justify-center">
              <span className="text-navy font-bold text-sm">ES</span>
            </div>
            <div>
              <div className="text-sm font-bold text-white">Easy</div>
              <div className="text-xs text-cream-300">Intelligence Sociale</div>
            </div>
          </div>
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="flex justify-center">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold to-gold-500 flex items-center justify-center">
                  <span className="text-navy font-bold">ES</span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-navy-700 text-white border-navy-400">
              Easy
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 space-y-1 p-3 overflow-y-auto",
        isCollapsed && "p-2"
      )}>
        {menuItems.map((item) => (
          <MenuItem key={item.href} item={item} />
        ))}
      </nav>

      {/* Footer - Credits & User */}
      <div className={cn("border-t border-navy-400 p-3 space-y-2", isCollapsed && "p-2")}>
        {/* Credits */}
        {!isCollapsed ? (
          <div className="px-3 py-2 bg-gradient-to-r from-gold/10 to-gold/20 rounded-lg border border-gold/30">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-cream-300">Crédits</span>
              <Coins className="h-3 w-3 text-gold" />
            </div>
            <div className="text-lg font-bold text-gold">
              <CreditBadge />
            </div>
          </div>
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-full bg-gold/10 hover:bg-gold/20 text-gold">
                <Coins className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-navy-700 text-white border-navy-400">
              <CreditBadge />
            </TooltipContent>
          </Tooltip>
        )}

        {/* User Info */}
        {!isCollapsed ? (
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-navy-400 transition-colors">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-gold to-gold-500 text-navy text-xs">
                {user?.name ? getInitials(user.name) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.name || 'Utilisateur'}</p>
              <p className="text-[10px] text-cream-300 truncate">{user?.email}</p>
            </div>
          </div>
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="flex justify-center">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-br from-gold to-gold-500 text-navy">
                    {user?.name ? getInitials(user.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-navy-700 text-white border-navy-400">
              <p className="font-medium">{user?.name || 'Utilisateur'}</p>
              <p className="text-xs text-cream-400">{user?.email}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Logout */}
        {!isCollapsed ? (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-cream-400 hover:text-white hover:bg-navy-400"
            onClick={() => { handleLogout(); onNavigate?.(); }}
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">Déconnexion</span>
          </Button>
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-full text-cream-400 hover:text-white hover:bg-navy-400"
                onClick={() => { handleLogout(); onNavigate?.(); }}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-navy-700 text-white border-navy-400">
              Déconnexion
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default CollapsibleSidebar;
