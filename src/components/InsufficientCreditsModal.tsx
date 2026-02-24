import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, Coins, ShoppingCart, TrendingUp } from 'lucide-react';

interface InsufficientCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiredCredits: number;
  currentBalance: number;
  serviceType?: string;
  itemCount?: number;
}

export const InsufficientCreditsModal = ({
  open,
  onOpenChange,
  requiredCredits,
  currentBalance,
  serviceType,
  itemCount,
}: InsufficientCreditsModalProps) => {
  const shortfall = requiredCredits - currentBalance;

  const getServiceLabel = (service?: string) => {
    const labels: Record<string, string> = {
      facebook_posts: 'Posts Facebook',
      facebook_pages: 'Pages Facebook',
      marketplace: 'Marketplace',
    };
    return service ? labels[service] || service : 'cette action';
  };

  const recommendedPacks = [
    {
      name: 'Pack Starter',
      credits: 50,
      price: '5€',
      description: '100 extractions',
      popular: false,
    },
    {
      name: 'Pack Pro',
      credits: 150,
      price: '15€',
      description: '300 extractions',
      popular: true,
    },
    {
      name: 'Pack Business',
      credits: 500,
      price: '50€',
      description: '1000 extractions',
      popular: false,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gold-100 rounded-full">
              <AlertCircle className="h-6 w-6 text-gold-600" />
            </div>
            <DialogTitle className="text-2xl">Crédits Insuffisants</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Vous n'avez pas assez de crédits pour effectuer cette action.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Balance Info */}
          <Card className="p-4 bg-gold-50 border-gold-200">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-gold-600" />
                  <span className="font-medium">Solde actuel</span>
                </div>
                <span className="text-2xl font-bold text-gold-700">
                  {currentBalance.toFixed(1)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-gold-600" />
                  <span className="font-medium">Crédits requis</span>
                </div>
                <span className="text-2xl font-bold text-gold-700">
                  {requiredCredits.toFixed(1)}
                </span>
              </div>

              <div className="pt-3 border-t border-gold-300">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gold-800">
                    Crédits manquants
                  </span>
                  <span className="text-xl font-bold text-gold-900">
                    {shortfall.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Action Details */}
          {serviceType && itemCount && (
            <div className="text-sm text-muted-foreground">
              <p>
                <span className="font-medium">Action :</span> {getServiceLabel(serviceType)}
              </p>
              <p>
                <span className="font-medium">Nombre d'items :</span> {itemCount}
              </p>
              <p>
                <span className="font-medium">Coût :</span> {requiredCredits.toFixed(1)} crédits
                (0.5 crédit par item)
              </p>
            </div>
          )}

          {/* Recommended Packs */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Packs recommandés
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {recommendedPacks.map((pack) => (
                <Card
                  key={pack.name}
                  className={`p-4 cursor-pointer hover:border-primary transition-all ${
                    pack.popular ? 'border-2 border-primary bg-primary/5' : ''
                  }`}
                >
                  {pack.popular && (
                    <div className="mb-2">
                      <span className="text-xs font-semibold bg-primary text-primary-foreground px-2 py-1 rounded">
                        Populaire
                      </span>
                    </div>
                  )}
                  <div className="space-y-2">
                    <h4 className="font-semibold">{pack.name}</h4>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-primary">
                        {pack.credits}
                      </span>
                      <span className="text-sm text-muted-foreground">crédits</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{pack.description}</p>
                    <p className="text-lg font-bold">{pack.price}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="bg-navy-50 border border-navy-200 rounded-lg p-4">
            <p className="text-sm text-navy">
              <span className="font-semibold">💡 Bon à savoir :</span> Les crédits n'expirent
              jamais et peuvent être utilisés pour tous nos services (Posts, Pages, Marketplace).
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Annuler
          </Button>
          <Link to="/pricing" className="w-full sm:w-auto">
            <Button className="w-full" onClick={() => onOpenChange(false)}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Acheter des crédits
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
