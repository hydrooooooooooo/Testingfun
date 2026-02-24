import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '@/context/DashboardContext';
import { useCredits } from '@/hooks/useCredits';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Coins,
  ShoppingBag,
  Facebook,
  Layers,
  Activity,
  ArrowRight,
  Loader2,
  AlertCircle,
  Zap,
  CreditCard,
  Sparkles,
  Calendar,
  TrendingUp,
  Package,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Session } from '@/types';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userData, error, isLoading, fetchDashboardData } = useDashboard();
  const { balance } = useCredits();

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Computed stats
  const computed = useMemo(() => {
    if (!userData) return null;

    const sessions = userData.sessions || [];
    const payments = userData.payments || [];

    const marketplaceSessions = sessions.filter(
      (s) => !s.scrape_type || s.scrape_type === 'marketplace'
    );
    const facebookSessions = sessions.filter(
      (s) => s.scrape_type === 'facebook_pages'
    );

    const activeSessions = sessions.filter(
      (s) => s.status === 'running' || s.status === 'pending'
    );
    const completedSessions = sessions.filter(
      (s) => s.status === 'completed'
    );

    const totalItemsScraped = sessions.reduce(
      (sum, s) => sum + (s.totalItems || 0),
      0
    );

    const totalFbPages = facebookSessions.reduce(
      (sum, s) => sum + (s.sub_sessions?.length || 0),
      0
    );

    const totalPaymentsAmount = payments
      .filter((p) => p.status === 'succeeded' || p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    // Recent activity: merge sessions + payments, sort by date
    const recentSessions = sessions.slice(0, 8).map((s) => ({
      type: 'session' as const,
      id: s.id,
      date: s.created_at,
      status: s.status,
      scrapeType: s.scrape_type || 'marketplace',
      items: s.totalItems || 0,
      pages: s.sub_sessions?.length || 0,
    }));

    const recentPayments = payments.slice(0, 5).map((p) => ({
      type: 'payment' as const,
      id: String(p.id),
      date: p.created_at,
      status: p.status,
      amount: p.amount,
      currency: p.currency,
      description: p.description,
    }));

    const recentActivity = [...recentSessions, ...recentPayments]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);

    return {
      totalSessions: sessions.length,
      marketplaceCount: marketplaceSessions.length,
      facebookCount: facebookSessions.length,
      activeSessions: activeSessions.length,
      completedSessions: completedSessions.length,
      totalItemsScraped,
      totalFbPages,
      totalPaymentsAmount,
      paymentsCount: payments.length,
      recentActivity,
    };
  }, [userData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh] bg-cream-50">
        <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
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
          <CardContent className="text-red-300">{error}</CardContent>
        </Card>
      </div>
    );
  }

  if (!userData || !computed) {
    return (
      <div className="flex items-center justify-center h-[60vh] bg-cream-50">
        <p className="text-steel">Aucune donnée disponible.</p>
      </div>
    );
  }

  const creditTotal = balance ? Number(balance.total) : 0;

  return (
    <div className="h-full bg-cream-50 p-4 sm:p-6 space-y-5 pt-12 md:pt-4">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy">
            Bonjour, {user?.name || 'utilisateur'}
          </h1>
          <p className="text-steel mt-1">
            Voici un résumé de votre activité sur EasyScrapy
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate('/dashboard/marketplace')}
            className="bg-navy hover:bg-navy-600 text-white"
            size="sm"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Marketplace
          </Button>
          <Button
            onClick={() => navigate('/dashboard/facebook-pages')}
            variant="outline"
            className="border-steel-300 text-navy hover:bg-cream-100"
            size="sm"
          >
            <Facebook className="w-4 h-4 mr-2" />
            Facebook
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Credits */}
        <Card
          className="bg-gradient-to-br from-gold-500 to-gold-600 border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/dashboard/credits')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-medium text-white/80">
              Crédits
            </CardTitle>
            <Coins className="h-5 w-5 text-white/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-white">
              {creditTotal.toFixed(1)}
            </div>
            <p className="text-xs text-white/70 mt-1">
              {balance?.trial
                ? `dont ${Number(balance.trial).toFixed(1)} d'essai`
                : 'disponibles'}
            </p>
          </CardContent>
        </Card>

        {/* Total Extractions */}
        <Card className="bg-white border-cream-300 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-medium text-navy-700">
              Extractions
            </CardTitle>
            <Layers className="h-5 w-5 text-steel" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-navy">
              {computed.totalSessions}
            </div>
            <p className="text-xs text-steel mt-1">
              {computed.marketplaceCount} marketplace · {computed.facebookCount}{' '}
              facebook
            </p>
          </CardContent>
        </Card>

        {/* Items scraped */}
        <Card className="bg-white border-cream-300 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-medium text-navy-700">
              Items scrapés
            </CardTitle>
            <Package className="h-5 w-5 text-steel" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-navy">
              {computed.totalItemsScraped.toLocaleString('fr-FR')}
            </div>
            <p className="text-xs text-steel mt-1">
              {computed.totalFbPages > 0
                ? `+ ${computed.totalFbPages} pages FB`
                : 'toutes plateformes'}
            </p>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card className="bg-white border-cream-300 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-medium text-navy-700">
              Sessions actives
            </CardTitle>
            <Activity className="h-5 w-5 text-steel" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-navy">
              {computed.activeSessions}
            </div>
            <p className="text-xs text-steel mt-1">
              {computed.completedSessions} terminées
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card
          className="bg-white border-cream-300 shadow-sm hover:border-gold-300 transition-colors cursor-pointer group"
          onClick={() => navigate('/dashboard/marketplace')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-navy/10 rounded-xl group-hover:bg-navy/20 transition-colors">
              <ShoppingBag className="h-6 w-6 text-navy" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-navy">Scraping Marketplace</p>
              <p className="text-xs text-steel">
                Extraire des annonces Facebook
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-steel group-hover:text-navy transition-colors" />
          </CardContent>
        </Card>

        <Card
          className="bg-white border-cream-300 shadow-sm hover:border-gold-300 transition-colors cursor-pointer group"
          onClick={() => navigate('/dashboard/facebook-pages')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-steel/10 rounded-xl group-hover:bg-steel/20 transition-colors">
              <Facebook className="h-6 w-6 text-steel-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-navy">Facebook Pages</p>
              <p className="text-xs text-steel">
                Analyser des pages et posts
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-steel group-hover:text-navy transition-colors" />
          </CardContent>
        </Card>

        <Card
          className="bg-white border-cream-300 shadow-sm hover:border-gold-300 transition-colors cursor-pointer group"
          onClick={() => navigate('/pricing')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-gold/10 rounded-xl group-hover:bg-gold/20 transition-colors">
              <Zap className="h-6 w-6 text-gold-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-navy">Acheter des crédits</p>
              <p className="text-xs text-steel">Recharger votre compte</p>
            </div>
            <ArrowRight className="h-4 w-4 text-steel group-hover:text-navy transition-colors" />
          </CardContent>
        </Card>
      </div>

      {/* Two Columns: Activity + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
        {/* Left: Recent Activity (3/5) */}
        <Card className="lg:col-span-3 bg-white border-cream-300 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-navy text-lg">
              Activité récente
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-steel hover:text-navy"
              onClick={() => navigate('/dashboard/extractions')}
            >
              Tout voir
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {computed.recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-10 w-10 mx-auto mb-3 text-steel/40" />
                <p className="text-steel">Aucune activité pour le moment</p>
                <p className="text-xs text-steel mt-1">
                  Lancez votre première extraction pour commencer
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {computed.recentActivity.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-cream-200 hover:bg-cream-50 transition-colors"
                  >
                    {/* Icon */}
                    <div
                      className={`p-2 rounded-lg ${
                        item.type === 'payment'
                          ? 'bg-green-500/10'
                          : item.type === 'session' &&
                              (item as any).scrapeType === 'facebook_pages'
                            ? 'bg-steel/10'
                            : 'bg-navy/10'
                      }`}
                    >
                      {item.type === 'payment' ? (
                        <CreditCard className="h-4 w-4 text-green-500" />
                      ) : (item as any).scrapeType === 'facebook_pages' ? (
                        <Facebook className="h-4 w-4 text-steel-600" />
                      ) : (
                        <ShoppingBag className="h-4 w-4 text-navy" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-navy truncate">
                          {item.type === 'payment'
                            ? (item as any).description || 'Paiement'
                            : (item as any).scrapeType === 'facebook_pages'
                              ? `Facebook Pages · ${(item as any).pages} page${(item as any).pages > 1 ? 's' : ''}`
                              : `Marketplace · ${(item as any).items} items`}
                        </p>
                        <StatusBadge status={item.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Calendar className="h-3 w-3 text-steel" />
                        <p className="text-xs text-steel">
                          {format(
                            new Date(item.date),
                            "d MMM yyyy 'à' HH:mm",
                            { locale: fr }
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Right info */}
                    <div className="text-right">
                      {item.type === 'payment' ? (
                        <p className="text-sm font-semibold text-green-500">
                          {new Intl.NumberFormat('fr-FR').format(
                            (item as any).amount
                          )}{' '}
                          {((item as any).currency || 'EUR').toUpperCase()}
                        </p>
                      ) : (
                        <p className="text-xs font-mono text-steel">
                          {item.id.substring(0, 12)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Stats by Service (2/5) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Breakdown by type */}
          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader>
              <CardTitle className="text-navy text-lg">
                Répartition par service
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Marketplace */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-navy/10 rounded-lg">
                  <ShoppingBag className="h-5 w-5 text-navy" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-navy">Marketplace</p>
                    <span className="text-sm font-bold text-navy">
                      {computed.marketplaceCount}
                    </span>
                  </div>
                  <div className="w-full bg-cream-200 rounded-full h-2">
                    <div
                      className="bg-navy rounded-full h-2 transition-all"
                      style={{
                        width: `${computed.totalSessions > 0 ? (computed.marketplaceCount / computed.totalSessions) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Facebook Pages */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-steel/10 rounded-lg">
                  <Facebook className="h-5 w-5 text-steel-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-navy">
                      Facebook Pages
                    </p>
                    <span className="text-sm font-bold text-navy">
                      {computed.facebookCount}
                    </span>
                  </div>
                  <div className="w-full bg-cream-200 rounded-full h-2">
                    <div
                      className="bg-steel rounded-full h-2 transition-all"
                      style={{
                        width: `${computed.totalSessions > 0 ? (computed.facebookCount / computed.totalSessions) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {computed.totalSessions === 0 && (
                <p className="text-xs text-steel text-center py-2">
                  Pas encore d'extractions
                </p>
              )}
            </CardContent>
          </Card>

          {/* Payments summary */}
          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-navy text-lg">Paiements</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-steel hover:text-navy"
                onClick={() => navigate('/dashboard/payments')}
              >
                Détails
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-steel">Total dépensé</p>
                <p className="text-xl font-bold text-navy">
                  {computed.totalPaymentsAmount > 0
                    ? new Intl.NumberFormat('fr-FR').format(
                        computed.totalPaymentsAmount
                      )
                    : '0'}{' '}
                  <span className="text-sm text-steel font-normal">MGA</span>
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-steel">Transactions</p>
                <p className="text-lg font-semibold text-navy">
                  {computed.paymentsCount}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* AI Analyses shortcut */}
          <Card
            className="bg-gradient-to-br from-navy to-navy-600 border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/dashboard/ai-analyses')}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <Sparkles className="h-6 w-6 text-gold-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">Analyses IA</p>
                <p className="text-xs text-white/60">
                  Obtenez des insights sur vos pages
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-white/50" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Status badge component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { label: string; className: string }> = {
    completed: {
      label: 'Terminé',
      className: 'bg-green-500/10 text-green-600 border-green-500/20',
    },
    succeeded: {
      label: 'Réussi',
      className: 'bg-green-500/10 text-green-600 border-green-500/20',
    },
    running: {
      label: 'En cours',
      className: 'bg-navy/10 text-navy border-navy/20',
    },
    pending: {
      label: 'En attente',
      className: 'bg-gold/10 text-gold-600 border-gold/20',
    },
    failed: {
      label: 'Échoué',
      className: 'bg-red-500/10 text-red-500 border-red-500/20',
    },
  };
  const { label, className } = config[status] || {
    label: status,
    className: 'bg-steel/10 text-steel border-steel/20',
  };
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${className}`}>
      {label}
    </Badge>
  );
};

export default DashboardPage;
