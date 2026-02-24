import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Bell,
  Settings,
  User
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface DashboardHeaderProps {
  notifications?: number;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ notifications = 0 }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

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

  return (
    <div className="border-b border-cream-300 bg-white px-3 sm:px-4 md:px-6 py-3 md:py-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Search Bar - Hidden on mobile, visible from sm */}
        <div className="hidden sm:flex flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-200" />
            <Input
              type="text"
              placeholder="Rechercher une page, extraction, analyse..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-cream-50 border-cream-300 text-navy placeholder:text-steel-200 focus:border-gold-500"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 ml-auto pl-12 sm:pl-0">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-steel hover:text-navy hover:bg-cream-100"
              >
                <Bell className="h-5 w-5" />
                {notifications > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs border-0">
                    {notifications}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-white border-cream-300">
              <DropdownMenuLabel className="text-navy">Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-cream-100" />
              {notifications > 0 ? (
                <>
                  <DropdownMenuItem className="text-navy-700 hover:bg-cream-50 cursor-pointer">
                    <div className="flex flex-col gap-1">
                      <p className="font-medium">Nouvelle extraction terminée</p>
                      <p className="text-xs text-steel">Il y a 5 minutes</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-navy-700 hover:bg-cream-50 cursor-pointer">
                    <div className="flex flex-col gap-1">
                      <p className="font-medium">Analyse IA disponible</p>
                      <p className="text-xs text-steel">Il y a 1 heure</p>
                    </div>
                  </DropdownMenuItem>
                </>
              ) : (
                <div className="p-4 text-center text-steel text-sm">
                  Aucune notification
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard/settings')}
            className="text-steel hover:text-navy hover:bg-cream-100"
          >
            <Settings className="h-5 w-5" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 text-navy-700 hover:text-navy hover:bg-cream-100"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gold-500 text-white text-xs">
                    {user?.name ? getInitials(user.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden md:inline">
                  {user?.name || 'Utilisateur'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border-cream-300">
              <DropdownMenuLabel className="text-navy">
                <div className="flex flex-col gap-1">
                  <p className="font-medium">{user?.name || 'Utilisateur'}</p>
                  <p className="text-xs text-steel font-normal">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-cream-100" />
              <DropdownMenuItem
                onClick={() => navigate('/dashboard/settings')}
                className="text-navy-700 hover:bg-cream-50 cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" />
                Profil
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate('/dashboard/settings')}
                className="text-navy-700 hover:bg-cream-50 cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-cream-100" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 hover:bg-cream-50 cursor-pointer"
              >
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
