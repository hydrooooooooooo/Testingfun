import { Link } from 'react-router-dom';
import { Coins, Loader2 } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const CreditBadge = () => {
  const { balance, loading, error } = useCredits();

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  if (error || !balance) {
    return null;
  }

  const isLowBalance = balance.balance < 5;
  const isTrialExpiringSoon = balance.trial_expires_at && 
    new Date(balance.trial_expires_at).getTime() - Date.now() < 24 * 60 * 60 * 1000; // 24h

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link to="/dashboard/credits">
            <Button
              variant="outline"
              className={`flex items-center gap-2 ${
                isLowBalance ? 'border-gold-500 bg-gold-50 hover:bg-gold-100' : ''
              }`}
            >
              <Coins className={`h-4 w-4 ${isLowBalance ? 'text-gold-600' : 'text-primary'}`} />
              <span className={`font-semibold ${isLowBalance ? 'text-gold-700' : ''}`}>
                {Number(balance.balance).toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">crédits</span>
            </Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">Solde de crédits</p>
            <div className="text-sm space-y-1">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-medium">{Number(balance.balance).toFixed(1)} crédits</span>
              </div>
              {balance.trial > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Essai:</span>
                  <span className="font-medium text-green-600">{Number(balance.trial).toFixed(1)} crédits</span>
                </div>
              )}
              {balance.purchased > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Achetés:</span>
                  <span className="font-medium">{Number(balance.purchased).toFixed(1)} crédits</span>
                </div>
              )}
            </div>
            {isTrialExpiringSoon && balance.trial > 0 && (
              <p className="text-xs text-gold-600 mt-2">
                ⚠️ Vos crédits d'essai expirent bientôt !
              </p>
            )}
            {isLowBalance && (
              <p className="text-xs text-gold-600 mt-2">
                ⚠️ Solde faible - Rechargez vos crédits
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Cliquez pour voir l'historique
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
