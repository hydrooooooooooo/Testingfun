import { useEffect, useState } from 'react';
import { useCredits, DetailedCostEstimate, CostBreakdownItem } from '@/hooks/useCredits';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, AlertCircle, CheckCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CostEstimatorProps {
  serviceType: 'facebook_posts' | 'facebook_pages' | 'marketplace';
  itemCount: number;
  className?: string;
  onEstimateChange?: (estimate: {
    cost: number;
    hasEnough: boolean;
    shortfall: number;
  }) => void;
}

interface DetailedCostEstimatorProps {
  serviceType: 'marketplace' | 'facebook_pages' | 'benchmark' | 'ai_analysis';
  params: {
    itemCount?: number;
    pageCount?: number;
    postsPerPage?: number;
    includeComments?: boolean;
    commentsPerPost?: number;
    competitorCount?: number;
    postsLimit?: number;
    myPageUrl?: string;
    includeAiAnalysis?: boolean;
  };
  className?: string;
  showBreakdown?: boolean;
  onEstimateChange?: (estimate: {
    cost: number;
    hasEnough: boolean;
    shortfall: number;
    breakdown: CostBreakdownItem[];
  }) => void;
}

export const CostEstimator = ({
  serviceType,
  itemCount,
  className = '',
  onEstimateChange,
}: CostEstimatorProps) => {
  const { balance, estimateCost } = useCredits();
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<{
    estimatedCost: number;
    currentBalance: number;
    hasEnoughCredits: boolean;
    shortfall: number;
  } | null>(null);

  useEffect(() => {
    if (itemCount > 0) {
      fetchEstimate();
    }
  }, [serviceType, itemCount]);

  const fetchEstimate = async () => {
    try {
      setEstimating(true);
      const result = await estimateCost(serviceType, itemCount);
      if (result) {
        setEstimate(result);
        onEstimateChange?.({
          cost: result.estimatedCost,
          hasEnough: result.hasEnoughCredits,
          shortfall: result.shortfall,
        });
      }
    } catch (error) {
      console.error('Error estimating cost:', error);
    } finally {
      setEstimating(false);
    }
  };

  if (itemCount === 0) {
    return null;
  }

  if (estimating) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Estimation du coût...</span>
        </div>
      </Card>
    );
  }

  if (!estimate) {
    return null;
  }

  const hasEnough = estimate.hasEnoughCredits;

  return (
    <Card
      className={`p-4 ${
        hasEnough ? 'border-green-200 bg-green-50' : 'border-gold-200 bg-gold-50'
      } ${className}`}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className={`h-5 w-5 ${hasEnough ? 'text-green-600' : 'text-gold-600'}`} />
            <span className="font-semibold">Coût estimé</span>
          </div>
          {hasEnough ? (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Suffisant
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertCircle className="h-3 w-3 mr-1" />
              Insuffisant
            </Badge>
          )}
        </div>

        {/* Cost Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">Coût de l'action</p>
            <p className="text-2xl font-bold">
              {estimate.estimatedCost.toFixed(1)}
              <span className="text-sm font-normal text-muted-foreground ml-1">crédits</span>
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Votre solde</p>
            <p className={`text-2xl font-bold ${hasEnough ? 'text-green-700' : 'text-gold-700'}`}>
              {estimate.currentBalance.toFixed(1)}
              <span className="text-sm font-normal text-muted-foreground ml-1">crédits</span>
            </p>
          </div>
        </div>

        {/* Balance After */}
        {hasEnough ? (
          <div className="pt-3 border-t border-green-300">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-800">Solde après action</span>
              <span className="font-bold text-green-900">
                {(estimate.currentBalance - estimate.estimatedCost).toFixed(1)} crédits
              </span>
            </div>
          </div>
        ) : (
          <div className="pt-3 border-t border-gold-300">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gold-800">Crédits manquants</span>
              <span className="font-bold text-gold-900">
                {estimate.shortfall.toFixed(1)} crédits
              </span>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p>
            💡 <span className="font-medium">Calcul :</span> {itemCount} item
            {itemCount > 1 ? 's' : ''} × 0.5 crédit = {estimate.estimatedCost.toFixed(1)} crédits
          </p>
        </div>
      </div>
    </Card>
  );
};

export const DetailedCostEstimator = ({
  serviceType,
  params,
  className = '',
  showBreakdown = true,
  onEstimateChange,
}: DetailedCostEstimatorProps) => {
  const { 
    estimateMarketplaceCost, 
    estimateFacebookPagesCost, 
    estimateBenchmarkCost, 
    estimateAiAnalysisCost 
  } = useCredits();
  
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<DetailedCostEstimate | null>(null);
  const [breakdownExpanded, setBreakdownExpanded] = useState(false);

  useEffect(() => {
    fetchEstimate();
  }, [serviceType, JSON.stringify(params)]);

  const fetchEstimate = async () => {
    try {
      setEstimating(true);
      let result: DetailedCostEstimate | null = null;

      switch (serviceType) {
        case 'marketplace':
          if (params.itemCount && params.itemCount > 0) {
            result = await estimateMarketplaceCost(params.itemCount);
          }
          break;
        case 'facebook_pages':
          if (params.pageCount && params.pageCount > 0) {
            result = await estimateFacebookPagesCost({
              pageCount: params.pageCount,
              postsPerPage: params.postsPerPage || 50,
              includeComments: params.includeComments,
              commentsPerPost: params.commentsPerPost,
            });
          }
          break;
        case 'benchmark':
          if (params.competitorCount && params.competitorCount > 0) {
            result = await estimateBenchmarkCost({
              myPageUrl: params.myPageUrl,
              competitorCount: params.competitorCount,
              postsLimit: params.postsLimit || 20,
              includeAiAnalysis: params.includeAiAnalysis,
            });
          }
          break;
        case 'ai_analysis':
          if (params.pageCount && params.pageCount > 0) {
            result = await estimateAiAnalysisCost({
              pageCount: params.pageCount,
              postsPerPage: params.postsPerPage || 20,
            });
          }
          break;
      }

      if (result) {
        setEstimate(result);
        onEstimateChange?.({
          cost: result.totalCost,
          hasEnough: result.hasEnough,
          shortfall: result.shortfall,
          breakdown: result.breakdown,
        });
      }
    } catch (error) {
      console.error('Error estimating cost:', error);
    } finally {
      setEstimating(false);
    }
  };

  const isValid = () => {
    switch (serviceType) {
      case 'marketplace':
        return params.itemCount && params.itemCount > 0;
      case 'facebook_pages':
      case 'ai_analysis':
        return params.pageCount && params.pageCount > 0;
      case 'benchmark':
        return params.competitorCount && params.competitorCount > 0;
      default:
        return false;
    }
  };

  if (!isValid()) {
    return null;
  }

  if (estimating) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Estimation du coût...</span>
        </div>
      </Card>
    );
  }

  if (!estimate) {
    return null;
  }

  const hasEnough = estimate.hasEnough;

  return (
    <Card
      className={cn(
        'p-4',
        hasEnough ? 'border-green-200 bg-green-50' : 'border-gold-200 bg-gold-50',
        className
      )}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className={cn('h-5 w-5', hasEnough ? 'text-green-600' : 'text-gold-600')} />
            <span className="font-semibold text-navy">Coût estimé</span>
          </div>
          {hasEnough ? (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Suffisant
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertCircle className="h-3 w-3 mr-1" />
              Insuffisant
            </Badge>
          )}
        </div>

        {/* Cost Summary */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-steel mb-1">Coût total</p>
            <p className="text-2xl font-bold text-navy">
              {estimate.totalCost.toFixed(1)}
              <span className="text-sm font-normal text-steel ml-1">crédits</span>
            </p>
          </div>
          <div>
            <p className="text-steel mb-1">Votre solde</p>
            <p className={cn('text-2xl font-bold', hasEnough ? 'text-green-700' : 'text-gold-700')}>
              {estimate.userBalance.toFixed(1)}
              <span className="text-sm font-normal text-steel ml-1">crédits</span>
            </p>
          </div>
        </div>

        {/* Breakdown Toggle */}
        {showBreakdown && estimate.breakdown.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setBreakdownExpanded(!breakdownExpanded)}
              className={cn(
                'flex items-center gap-1 text-sm font-medium w-full justify-between py-2 px-3 rounded-md transition-colors',
                hasEnough ? 'text-green-700 hover:bg-green-100' : 'text-gold-700 hover:bg-gold-100'
              )}
            >
              <span>Détail du calcul</span>
              {breakdownExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {breakdownExpanded && (
              <div className={cn(
                'mt-2 rounded-md p-3 space-y-2',
                hasEnough ? 'bg-green-100/50' : 'bg-gold-100/50'
              )}>
                {estimate.breakdown.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-navy-700">
                      {item.label}
                      <span className="text-steel ml-1">
                        ({item.quantity} × {item.unitCost.toFixed(2)})
                      </span>
                    </span>
                    <span className="font-medium text-navy">
                      {item.subtotal.toFixed(1)} cr
                    </span>
                  </div>
                ))}
                <div className={cn(
                  'flex items-center justify-between text-sm font-bold pt-2 border-t',
                  hasEnough ? 'border-green-300' : 'border-gold-300'
                )}>
                  <span>Total</span>
                  <span>{estimate.totalCost.toFixed(1)} crédits</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Balance After / Shortfall */}
        {hasEnough ? (
          <div className={cn('pt-3 border-t', hasEnough ? 'border-green-300' : 'border-gold-300')}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-800">Solde après action</span>
              <span className="font-bold text-green-900">
                {estimate.balanceAfter.toFixed(1)} crédits
              </span>
            </div>
          </div>
        ) : (
          <div className="pt-3 border-t border-gold-300">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gold-800">Crédits manquants</span>
              <span className="font-bold text-gold-900">
                {estimate.shortfall.toFixed(1)} crédits
              </span>
            </div>
            <p className="text-xs text-gold-700 mt-2">
              💡 Rechargez votre compte pour continuer
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
