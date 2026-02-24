import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCredits, CreditHistory } from '@/hooks/useCredits';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, ShoppingCart, TrendingUp, TrendingDown, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const CreditsPage = () => {
  const { balance, loading, error, fetchHistory, refreshBalance } = useCredits();
  const [history, setHistory] = useState<CreditHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadHistory(1);
  }, []);

  const loadHistory = async (page: number) => {
    try {
      setHistoryLoading(true);
      const data = await fetchHistory(page, 20);
      setHistory(data);
      setCurrentPage(page);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'trial_grant':
        return <Coins className="h-4 w-4 text-green-600" />;
      case 'purchase':
        return <ShoppingCart className="h-4 w-4 text-navy" />;
      case 'usage':
        return <TrendingDown className="h-4 w-4 text-gold-600" />;
      case 'refund':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'expiration':
        return <Clock className="h-4 w-4 text-red-600" />;
      default:
        return <Coins className="h-4 w-4 text-steel" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    const labels: Record<string, string> = {
      'trial_grant': 'Crédits d\'essai',
      'purchase': 'Achat de crédits',
      'usage': 'Utilisation',
      'refund': 'Remboursement',
      'expiration': 'Expiration',
      'bonus': 'Bonus',
      'adjustment': 'Ajustement'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      'completed': { variant: 'default', label: 'Complété' },
      'pending': { variant: 'secondary', label: 'En attente' },
      'failed': { variant: 'destructive', label: 'Échoué' },
      'cancelled': { variant: 'outline', label: 'Annulé' }
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getServiceLabel = (service: string) => {
    const services: Record<string, string> = {
      'marketplace_scraping': 'Scraping Marketplace',
      'facebook_pages_scraping': 'Scraping Facebook Pages',
      'ai_analysis': 'Analyse IA',
      'data_export': 'Export de données'
    };
    return services[service] || service;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] bg-cream-50">
        <RefreshCw className="w-8 h-8 animate-spin text-gold-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-cream-50 p-6">
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center">
              <AlertCircle className="mr-2" />
              Erreur
            </CardTitle>
          </CardHeader>
          <CardContent className="text-red-300">
            {error}
            <Button onClick={refreshBalance} className="mt-4">
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full bg-cream-50 p-4 sm:p-6 space-y-4 sm:space-y-6 pt-12 md:pt-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-navy">Mes Crédits</h1>
        <p className="text-steel mt-1">
          Gérez votre solde de crédits et consultez votre historique de transactions
        </p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {/* Total Balance */}
        <Card className="bg-white border-gold-300 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-steel">Solde Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl sm:text-4xl font-bold text-gold-500">
              {balance ? Number(balance.balance).toFixed(1) : '0.0'}
            </div>
            <p className="text-xs text-steel mt-2">crédits disponibles</p>
          </CardContent>
        </Card>

        {/* Trial Credits */}
        <Card className="bg-white border-cream-300 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-steel">Crédits d'Essai</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl sm:text-4xl font-bold text-navy">
              {balance ? Number(balance.trial).toFixed(1) : '0.0'}
            </div>
            <p className="text-xs text-steel mt-2">
              crédits d'essai
            </p>
          </CardContent>
        </Card>

        {/* Paid Credits */}
        <Card className="bg-white border-cream-300 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-steel">Crédits Achetés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl sm:text-4xl font-bold text-navy">
              {balance ? Number(balance.purchased).toFixed(1) : '0.0'}
            </div>
            <p className="text-xs text-steel mt-2">crédits payants</p>
          </CardContent>
        </Card>
      </div>

      {/* Buy Credits Button */}
      <Card className="bg-gradient-to-r from-gold-500 to-gold-600 border-0 shadow-lg">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Besoin de plus de crédits ?</h3>
              <p className="text-white/80 text-xs sm:text-sm">
                Rechargez votre compte pour continuer
              </p>
            </div>
            <Link to="/pricing" className="w-full sm:w-auto">
              <Button size="default" className="bg-white text-gold-600 hover:bg-cream-100 w-full sm:w-auto">
                <ShoppingCart className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Acheter
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card className="bg-white border-cream-300 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-navy">Historique des Transactions</CardTitle>
              <CardDescription className="text-steel">
                Consultez toutes vos transactions de crédits
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadHistory(currentPage)}
              disabled={historyLoading}
              className="border-cream-300 text-navy-700 hover:bg-cream-100"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${historyLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-steel-200" />
              <p className="text-sm text-steel-200">Chargement de l'historique...</p>
            </div>
          ) : history && history.transactions.length > 0 ? (
            <>
              <div className="space-y-4">
                {history.transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border border-cream-300 rounded-lg hover:bg-cream-50 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {getTransactionIcon(transaction.transaction_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-navy">{getTransactionLabel(transaction.transaction_type)}</p>
                          {getStatusBadge(transaction.status)}
                        </div>
                        {transaction.description && (
                          <p className="text-sm text-steel mb-1">
                            {transaction.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-steel">
                          <span>
                            {format(new Date(transaction.created_at), 'dd MMM yyyy', { locale: fr })}
                          </span>
                          {transaction.service_type && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span className="hidden sm:inline">{getServiceLabel(transaction.service_type)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className={`text-lg font-bold ${
                        Number(transaction.amount) > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {Number(transaction.amount) > 0 ? '+' : ''}{Number(transaction.amount).toFixed(1)}
                      </p>
                      <p className="text-xs text-steel">
                        Solde: {Number(transaction.balance_after).toFixed(1)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {history.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-cream-300">
                  <p className="text-sm text-steel">
                    Page {history.pagination.page} sur {history.pagination.totalPages}
                    {' '}({history.pagination.total} transactions)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadHistory(currentPage - 1)}
                      disabled={currentPage === 1 || historyLoading}
                      className="border-cream-300 text-navy-700 hover:bg-cream-100"
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadHistory(currentPage + 1)}
                      disabled={currentPage >= history.pagination.totalPages || historyLoading}
                      className="border-cream-300 text-navy-700 hover:bg-cream-100"
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Coins className="h-12 w-12 mx-auto mb-4 text-steel" />
              <p className="text-steel mb-2">Aucune transaction pour le moment</p>
              <p className="text-sm text-steel">
                Vos transactions de crédits apparaîtront ici
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditsPage;
