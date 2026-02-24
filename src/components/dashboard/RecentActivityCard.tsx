import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Facebook,
  ShoppingBag,
  Bell,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  type: 'facebook' | 'marketplace' | 'mention' | 'benchmark';
  title: string;
  subtitle: string;
  date: string;
  onClick?: () => void;
}

interface RecentActivityCardProps {
  activities: Activity[];
  className?: string;
}

const RecentActivityCard: React.FC<RecentActivityCardProps> = ({ activities, className }) => {
  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'facebook':
        return <Facebook className="h-5 w-5 text-navy" />;
      case 'marketplace':
        return <ShoppingBag className="h-5 w-5 text-steel-600" />;
      case 'mention':
        return <Bell className="h-5 w-5 text-gold-600" />;
      case 'benchmark':
        return <TrendingUp className="h-5 w-5 text-steel-600" />;
    }
  };

  const getActivityBgColor = (type: Activity['type']) => {
    switch (type) {
      case 'facebook':
        return 'bg-navy-100';
      case 'marketplace':
        return 'bg-steel-100';
      case 'mention':
        return 'bg-gold-100';
      case 'benchmark':
        return 'bg-steel-100';
    }
  };

  if (activities.length === 0) {
    return null;
  }

  return (
    <Card className={cn("bg-white border-cream-300 shadow-sm", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-semibold text-navy">
          Activité récente
        </CardTitle>
        <Button
          variant="link"
          size="sm"
          className="text-gold-500 hover:text-gold-600 p-0 h-auto"
        >
          Voir tout
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.map((activity) => (
          <div
            key={activity.id}
            onClick={activity.onClick}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg transition-colors",
              activity.onClick && "cursor-pointer hover:bg-cream-50"
            )}
          >
            <div className={cn(
              "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
              getActivityBgColor(activity.type)
            )}>
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-navy truncate">
                {activity.title}
              </p>
              <p className="text-xs text-steel truncate">
                {activity.subtitle}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="flex-shrink-0 text-steel hover:text-navy hover:bg-cream-100"
            >
              Voir
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default RecentActivityCard;
