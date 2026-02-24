import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Insight {
  id: string;
  type: 'opportunity' | 'trend' | 'warning';
  icon: 'lightbulb' | 'trending' | 'warning' | 'sparkles';
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface DashboardInsightsSectionProps {
  insights: Insight[];
  className?: string;
}

const DashboardInsightsSection: React.FC<DashboardInsightsSectionProps> = ({ insights, className }) => {
  const getIcon = (icon: Insight['icon']) => {
    switch (icon) {
      case 'lightbulb':
        return <Lightbulb className="h-5 w-5" />;
      case 'trending':
        return <TrendingUp className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'sparkles':
        return <Sparkles className="h-5 w-5" />;
    }
  };

  const getColors = (type: Insight['type']) => {
    switch (type) {
      case 'opportunity':
        return {
          bg: 'bg-green-500/10',
          border: 'border-green-500/20',
          icon: 'text-green-400',
          text: 'text-green-400'
        };
      case 'trend':
        return {
          bg: 'bg-navy/10',
          border: 'border-navy/20',
          icon: 'text-navy',
          text: 'text-navy'
        };
      case 'warning':
        return {
          bg: 'bg-gold-500/10',
          border: 'border-gold-500/20',
          icon: 'text-gold-400',
          text: 'text-gold-400'
        };
    }
  };

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-navy flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-steel-400" />
          Insights du jour
        </h3>
        <Button
          variant="link"
          size="sm"
          className="text-steel-400 hover:text-steel-300 p-0 h-auto"
        >
          <Sparkles className="mr-1 h-4 w-4" />
          IA
        </Button>
      </div>
      <div className="space-y-3">
        {insights.map((insight) => {
          const colors = getColors(insight.type);
          return (
            <Card
              key={insight.id}
              className={cn(
                "bg-[#1a1d29] border transition-colors",
                colors.bg,
                colors.border
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn("flex-shrink-0 mt-0.5", colors.icon)}>
                    {getIcon(insight.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={cn("font-semibold text-sm mb-1", colors.text)}>
                      {insight.title}
                    </h4>
                    <p className="text-sm text-steel-200 mb-3">
                      {insight.description}
                    </p>
                    {insight.actionLabel && insight.onAction && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={insight.onAction}
                        className={cn("p-0 h-auto text-xs font-semibold", colors.text)}
                      >
                        {insight.actionLabel}
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardInsightsSection;
