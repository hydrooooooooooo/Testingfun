import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Lightbulb,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Insight {
  id: string;
  type: 'opportunity' | 'warning' | 'trend' | 'success';
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  metric?: {
    value: string;
    change?: number;
  };
}

interface InsightsCardProps {
  insights: Insight[];
  className?: string;
}

const InsightsCard: React.FC<InsightsCardProps> = ({ insights, className }) => {
  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'opportunity':
        return <Lightbulb className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-gold-600" />;
      case 'trend':
        return <TrendingUp className="h-5 w-5 text-navy" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
  };

  const getInsightBgColor = (type: Insight['type']) => {
    switch (type) {
      case 'opportunity':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-gold-50 border-gold-200';
      case 'trend':
        return 'bg-navy-50 border-navy-200';
      case 'success':
        return 'bg-emerald-50 border-green-200';
    }
  };

  const getInsightBadgeColor = (type: Insight['type']) => {
    switch (type) {
      case 'opportunity':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-gold-100 text-gold-800 border-gold-200';
      case 'trend':
        return 'bg-navy-100 text-navy border-navy-200';
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  if (insights.length === 0) {
    return null;
  }

  return (
    <Card className={cn("border-0 shadow-sm", className)}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-gold-500" />
          Insights du jour
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className={cn(
              "p-4 rounded-lg border transition-all hover:shadow-sm",
              getInsightBgColor(insight.type)
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getInsightIcon(insight.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-semibold text-sm text-navy">
                    {insight.title}
                  </h4>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px] px-2 py-0 h-5 flex-shrink-0",
                      getInsightBadgeColor(insight.type)
                    )}
                  >
                    {insight.type === 'opportunity' && 'Opportunité'}
                    {insight.type === 'warning' && 'À surveiller'}
                    {insight.type === 'trend' && 'Tendance'}
                    {insight.type === 'success' && 'Succès'}
                  </Badge>
                </div>
                <p className="text-sm text-navy-700 mb-2">
                  {insight.description}
                </p>
                {insight.metric && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-bold text-navy">
                      {insight.metric.value}
                    </span>
                    {insight.metric.change !== undefined && (
                      <Badge 
                        variant="outline"
                        className={cn(
                          "text-xs px-2 py-0 h-5",
                          insight.metric.change > 0 
                            ? "bg-green-100 text-green-800 border-green-200"
                            : "bg-red-100 text-red-800 border-red-200"
                        )}
                      >
                        {insight.metric.change > 0 ? (
                          <TrendingUp className="h-3 w-3 mr-1 inline" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1 inline" />
                        )}
                        {Math.abs(insight.metric.change)}%
                      </Badge>
                    )}
                  </div>
                )}
                {insight.action && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={insight.action.onClick}
                    className="h-auto p-0 text-xs font-semibold"
                  >
                    {insight.action.label}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default InsightsCard;
