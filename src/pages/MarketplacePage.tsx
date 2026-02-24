import ScrapePreview from "@/components/ScrapePreview";
import ScrapeProgress from "@/components/ScrapeProgress";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import {
  FileSpreadsheet,
  FileText,
  RotateCw,
  ShoppingBag,
  Settings2,
  Info,
  Lightbulb,
} from "lucide-react";
import { FavoriteButton, FavoriteSelector, FavoritesManager } from "@/components/favorites";
import { Favorite } from "@/hooks/useFavorites";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/context/DashboardContext";
import { useCredits } from "@/hooks/useCredits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { CostEstimator } from "@/components/CostEstimator";
import { InsufficientCreditsModal } from "@/components/InsufficientCreditsModal";
import { useMarketplacePolling } from "../hooks/useMarketplacePolling";

export default function MarketplacePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const { fetchDashboardData } = useDashboard();
  const { refreshBalance } = useCredits();
  const [url, setUrl] = useState("");
  const [maxItems, setMaxItems] = useState(10);
  const [deepScrape, setDeepScrape] = useState(true);
  const [getProfileUrls, setGetProfileUrls] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [creditEstimate, setCreditEstimate] = useState<{
    cost: number;
    hasEnough: boolean;
    shortfall: number;
  } | null>(null);
  const [showFavoritesManager, setShowFavoritesManager] = useState(false);

  const { status, scrapeDone, isPaid, stats, previewItems, progress, loading: pollingLoading, error: pollingError } = useMarketplacePolling(sessionId);

  // Redirect to files when done
  useEffect(() => {
    if (scrapeDone) {
      fetchDashboardData();
      refreshBalance();
      navigate('/dashboard/marketplace-files');
    }
  }, [scrapeDone, fetchDashboardData, refreshBalance, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isAuthenticated()) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour lancer une extraction.",
        variant: "destructive",
      });
      navigate('/login?redirect=/dashboard/marketplace');
      return;
    }

    if (creditEstimate && !creditEstimate.hasEnough) {
      setShowInsufficientModal(true);
      return;
    }

    setLoading(true);

    if (!url.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer une URL valide",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/scrape', {
        url: url.trim(),
        resultsLimit: maxItems,
        deepScrape,
        getProfileUrls,
      });

      const data = response.data;
      const sessionIdFromResponse = data.data?.sessionId || data.sessionId;

      if (sessionIdFromResponse) {
        setSessionId(sessionIdFromResponse);
        toast({
          title: "Extraction lancée",
          description: "L'extraction est en cours...",
        });
      } else {
        throw new Error('Session ID non reçu du serveur');
      }
    } catch (error: any) {
      let errorMessage = 'Une erreur est survenue';
      if (error.response?.status === 409) {
        errorMessage = 'Une extraction est déjà en cours. Veuillez attendre.';
      } else if (error.response?.status === 402) {
        errorMessage = 'Crédits insuffisants.';
        setShowInsufficientModal(true);
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const resetScrape = () => {
    setSessionId(null);
    setUrl("");
    setMaxItems(10);
    setLoading(false);
  };

  const exportData = (format: 'excel' | 'csv') => {
    if (!sessionId) return;
    const exportUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/export/${format}/${sessionId}`;
    window.open(exportUrl, '_blank');
  };

  const isRunning = loading || pollingLoading;

  return (
    <div className="h-full bg-cream-50 p-4 sm:p-6 space-y-5 pt-12 md:pt-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-navy/10 rounded-lg">
            <ShoppingBag className="h-5 w-5 text-navy" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy">Marketplace</h1>
        </div>
        <p className="text-steel ml-12">
          Extrayez les annonces Facebook Marketplace en fichier Excel
        </p>
      </div>

      {/* Quick guide */}
      <div className="flex items-start gap-3 bg-navy/5 border border-navy/10 rounded-lg px-4 py-3">
        <Lightbulb className="h-4 w-4 text-gold-500 mt-0.5 flex-shrink-0" />
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-steel">
          <span><span className="font-semibold text-navy">1.</span> Collez une URL Marketplace</span>
          <span><span className="font-semibold text-navy">2.</span> Choisissez le nombre d'annonces</span>
          <span><span className="font-semibold text-navy">3.</span> Lancez et exportez en Excel/CSV</span>
        </div>
      </div>

      {/* Form */}
      <Card className="bg-white border-cream-300 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* URL Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="url" className="text-sm font-medium text-navy-700">
                  URL Facebook Marketplace
                </label>
                {isAuthenticated() && (
                  <FavoriteSelector
                    type="marketplace"
                    onSelect={(favorite: Favorite) => {
                      setUrl(favorite.url);
                      if (favorite.metadata?.maxItems) {
                        setMaxItems(favorite.metadata.maxItems);
                      }
                      toast({
                        title: "Favori chargé",
                        description: `"${favorite.name}" a été chargé`,
                      });
                    }}
                    onManageClick={() => setShowFavoritesManager(true)}
                    selectedUrl={url}
                    placeholder="Favoris"
                    className="h-7 text-xs"
                  />
                )}
              </div>
              <div className="relative">
                <input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.facebook.com/marketplace/category/vehicles"
                  className="w-full h-11 border border-cream-300 rounded-lg px-4 pr-12 text-sm focus:ring-2 focus:ring-navy/30 focus:border-navy bg-cream-50"
                  required
                  disabled={isRunning}
                />
                {url.trim() && isAuthenticated() && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <FavoriteButton
                      url={url}
                      type="marketplace"
                      defaultName="Recherche Marketplace"
                      metadata={{ maxItems }}
                      size="md"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* URL hint */}
            {!url.trim() && (
              <p className="text-xs text-steel flex items-center gap-1.5 -mt-1">
                <Info className="h-3 w-3 flex-shrink-0" />
                Ouvrez Facebook Marketplace, faites une recherche, puis copiez l'URL de la page
              </p>
            )}

            {/* Max Items */}
            <div>
              <label htmlFor="maxItems" className="text-sm font-medium text-navy-700 mb-1.5 block">
                Nombre d'annonces
              </label>
              <input
                id="maxItems"
                type="number"
                value={maxItems}
                onChange={(e) => setMaxItems(parseInt(e.target.value) || 10)}
                min="1"
                max="500"
                className="w-full h-11 border border-cream-300 rounded-lg px-4 text-sm focus:ring-2 focus:ring-navy/30 focus:border-navy bg-cream-50"
                disabled={isRunning}
              />
              <p className="text-xs text-steel mt-1">De 1 à 500 — plus d'annonces = plus de crédits</p>
            </div>

            {/* Advanced Options Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-steel hover:text-navy transition-colors"
            >
              <Settings2 className="h-4 w-4" />
              Options avancées
              <span className="text-xs">({showAdvanced ? 'masquer' : 'afficher'})</span>
            </button>

            {showAdvanced && (
              <div className="grid sm:grid-cols-2 gap-3 bg-cream-50 rounded-lg p-3 border border-cream-200">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deepScrape}
                    onChange={(e) => setDeepScrape(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-cream-300 text-navy focus:ring-navy"
                    disabled={isRunning}
                  />
                  <span>
                    <span className="block text-sm font-medium text-navy">Extraction approfondie</span>
                    <span className="block text-xs text-steel">Plus de données par annonce</span>
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={getProfileUrls}
                    onChange={(e) => setGetProfileUrls(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-cream-300 text-navy focus:ring-navy"
                    disabled={isRunning}
                  />
                  <span>
                    <span className="block text-sm font-medium text-navy">Profils vendeurs</span>
                    <span className="block text-xs text-steel">URLs des profils Facebook</span>
                  </span>
                </label>
              </div>
            )}

            {/* Cost Estimator */}
            {isAuthenticated() && url && maxItems > 0 && (
              <CostEstimator
                serviceType="marketplace"
                itemCount={maxItems}
                onEstimateChange={setCreditEstimate}
              />
            )}

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-11 font-semibold bg-navy hover:bg-navy-600"
              disabled={isRunning}
            >
              {isRunning ? "Extraction en cours..." : "Lancer l'extraction"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Progress */}
      {isRunning && (
        <Card className="bg-white border-cream-300 shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <ScrapeProgress
              percent={progress}
              stepLabel={status}
            />
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {scrapeDone && (
        <div className="space-y-4">
          {previewItems && previewItems.length > 0 && (
            <Card className="bg-white border-cream-300 shadow-sm">
              <CardHeader>
                <CardTitle className="text-navy">Aperçu des résultats</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrapePreview items={previewItems} />
              </CardContent>
            </Card>
          )}

          <Card className="bg-white border-cream-300 shadow-sm">
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-navy">
                    {stats?.nbItems ? `${stats.nbItems} annonces extraites` : 'Extraction terminée'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isPaid ? (
                    <>
                      <Button
                        onClick={() => exportData('excel')}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Excel
                      </Button>
                      <Button
                        onClick={() => exportData('csv')}
                        variant="outline"
                        className="border-cream-300"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        CSV
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-gold-600 font-medium">
                      Erreur de paiement. Contactez le support.
                    </p>
                  )}
                  <Button variant="ghost" onClick={resetScrape} size="sm">
                    <RotateCw className="w-4 h-4 mr-1" />
                    Nouveau
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modals */}
      <InsufficientCreditsModal
        open={showInsufficientModal}
        onOpenChange={setShowInsufficientModal}
        requiredCredits={creditEstimate?.cost || 0}
        currentBalance={(creditEstimate?.cost || 0) - (creditEstimate?.shortfall || 0)}
        serviceType="marketplace"
        itemCount={maxItems}
      />

      <FavoritesManager
        open={showFavoritesManager}
        onOpenChange={setShowFavoritesManager}
        defaultTab="marketplace"
      />
    </div>
  );
}
