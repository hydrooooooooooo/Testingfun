import ScrapePreview from "@/components/ScrapePreview";
import ScrapeProgress from "@/components/ScrapeProgress";
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "@/services/api";
import { Helmet } from "react-helmet";
import { 
  Clock, 
  Database, 
  BarChart3, 
  Zap, 
  FileSpreadsheet, 
  Shield, 
  CheckCircle,
  ArrowRight,
  Users,
  Building,
  TrendingUp,
  Search,
  Download,
  Play,
  Store,
  Target,
  PieChart,
  Briefcase,
  Home,
  Car,
  ShoppingBag,
  MapPin,
  BarChart2,
  LineChart,
  Copy,
  Link,
  Star,
  Timer,
  DollarSign,
  FileText,
  RotateCw,
  ArrowLeft
} from "lucide-react";
import { FavoriteButton, FavoriteSelector, FavoritesManager } from "@/components/favorites";
import { useFavorites, Favorite } from "@/hooks/useFavorites";
import TrialPopup from "@/components/TrialPopup";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/context/DashboardContext";
import { useCredits } from "@/hooks/useCredits";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { CostEstimator } from "@/components/CostEstimator";
import { InsufficientCreditsModal } from "@/components/InsufficientCreditsModal";
import { useMarketplacePolling } from "../hooks/useMarketplacePolling";

// Ajout Google Fonts (Inter)
if (typeof document !== "undefined" && !document.getElementById("google-inter")) {
  const link = document.createElement("link");
  link.id = "google-inter";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";
  document.head.appendChild(link);
}

export default function MarketplacePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const [showTrial, setShowTrial] = useState(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [creditEstimate, setCreditEstimate] = useState<{
    cost: number;
    hasEnough: boolean;
    shortfall: number;
  } | null>(null);
  const [showFavoritesManager, setShowFavoritesManager] = useState(false);

  const { status, scrapeDone, isPaid, stats, previewItems, progress, loading: pollingLoading, error: pollingError } = useMarketplacePolling(sessionId);

  // Show trial popup once per session for non-authenticated users
  useEffect(() => {
    const alreadyShown = sessionStorage.getItem('trialPopupShown');
    if (!isAuthenticated() && !alreadyShown) {
      setShowTrial(true);
    }
  }, [isAuthenticated]);

  // Quand l'extraction est terminée, rafraîchir dashboard + crédits et rediriger vers les fichiers Marketplace
  useEffect(() => {
    if (scrapeDone) {
      fetchDashboardData();
      refreshBalance();
      navigate('/dashboard/marketplace');
    }
  }, [scrapeDone, fetchDashboardData, refreshBalance, navigate]);

  // Gérer la soumission du formulaire
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Vérifier si l'utilisateur est connecté
    if (!isAuthenticated()) {
      sessionStorage.setItem('marketplace_pending_scrape', JSON.stringify({
        url,
        maxItems,
        timestamp: Date.now()
      }));
      
      toast({
        title: "🔒 Connexion requise",
        description: "Vous devez être connecté pour lancer une extraction. Redirection vers la page de connexion...",
        variant: "destructive",
      });
      
      setTimeout(() => {
        navigate('/login?redirect=/marketplace');
      }, 2000);
      return;
    }

    // Vérifier les crédits insuffisants
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
      // Utilise le contrôleur startScrape côté backend
      // qui attend: url, resultsLimit, deepScrape, getProfileUrls (optionnels)
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
          title: "✅ Extraction lancée",
          description: "Votre extraction a été lancée avec succès !",
        });
      } else {
        throw new Error('Session ID non reçu du serveur');
      }
    } catch (error: any) {
      console.error("Error:", error);
      
      let errorMessage = 'Une erreur est survenue';
      if (error.response?.status === 409) {
        errorMessage = 'Une extraction est déjà en cours. Veuillez attendre qu\'elle se termine avant d\'en lancer une nouvelle.';
      } else if (error.response?.status === 402) {
        errorMessage = 'Crédits insuffisants. Veuillez recharger votre solde.';
        setShowInsufficientModal(true);
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      toast({
        title: "❌ Erreur",
        description: errorMessage,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // Fonction pour réinitialiser et recommencer
  const resetScrape = () => {
    setSessionId(null);
    setUrl("");
    setMaxItems(10);
  };

  // Fonction pour exporter les données
  const exportData = (format: 'excel' | 'csv') => {
    if (!sessionId) return;
    const exportUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/export/${format}/${sessionId}`;
    window.open(exportUrl, '_blank');
  };

  return (
    <>
      <Helmet>
        <title>Scraper Facebook Marketplace | Export Excel des annonces | EasyScrapy</title>
        <meta
          name="description"
          content="Récupérez prix, descriptions, photos et contacts vendeurs de Facebook Marketplace. Export Excel en quelques secondes. Idéal pour prospection et veille tarifaire."
        />
      </Helmet>
      <div className="flex flex-col itemscenter min-h-screen w-full bg-gradient-to-b from-navy-50 to-white">
      
      {/* Hero Section Ultra Simplifié */}
      <section className="w-full max-w-7xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          {/* Badge d'introduction */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-navy-100 to-steel-100 text-navy rounded-full text-xs sm:text-sm font-semibold mb-6 border border-navy-200">
            <Zap className="w-4 h-4" />
            Extraction automatique Facebook Marketplace
          </div>
          
          {/* Titre principal simplifié et percutant */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-navy mb-4 tracking-tight leading-snug">
            Transformez une recherche
            <span className="block bg-gradient-to-r from-navy to-steel-600 bg-clip-text text-transparent">
              en fichier Excel
            </span>
          </h1>
          
          {/* Sous-titre ultra clair */}
          <p className="text-base md:text-lg text-navy-700 mb-6 max-w-3xl md:max-w-4xl mx-auto leading-normal font-medium">
            Copiez l'URL de votre recherche Facebook Marketplace,
            <span className="block text-navy font-semibold md:font-bold">obtenez TOUTES les données en Excel en 3 minutes ⚡</span>
          </p>

          {/* Bénéfices immédiats */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-8">
            <div className="group flex items-center gap-3 bg-white/80 backdrop-blur px-5 md:px-6 py-4 rounded-2xl shadow-lg border border-cream-200 hover:shadow-xl hover:-translate-y-0.5 transition-all">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500/15 to-green-500/10 flex items-center justify-center ring-1 ring-green-200">
                <Timer className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold md:font-bold text-navy">Fini le copier-coller</p>
                <p className="text-xs md:text-sm text-steel">3 minutes au lieu de 3 heures</p>
              </div>
            </div>
            
            <div className="group flex items-center gap-3 bg-white/80 backdrop-blur px-5 md:px-6 py-4 rounded-2xl shadow-lg border border-cream-200 hover:shadow-xl hover:-translate-y-0.5 transition-all">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-navy/15 to-navy/10 flex items-center justify-center ring-1 ring-navy-200">
                <FileSpreadsheet className="w-5 h-5 text-navy" />
              </div>
              <div className="text-left">
                <p className="font-semibold md:font-bold text-navy">Excel prêt à utiliser</p>
                <p className="text-xs md:text-sm text-steel">Toutes les données organisées</p>
              </div>
            </div>
            
            <div className="group flex items-center gap-3 bg-white/80 backdrop-blur px-5 md:px-6 py-4 rounded-2xl shadow-lg border border-cream-200 hover:shadow-xl hover:-translate-y-0.5 transition-all">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-steel-500/15 to-steel-500/10 flex items-center justify-center ring-1 ring-steel-200">
                <DollarSign className="w-5 h-5 text-steel-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold md:font-bold text-navy">Pas d'abonnement</p>
                <p className="text-xs md:text-sm text-steel">Payez uniquement ce que vous utilisez</p>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions ultra simples */}
        <div className="rounded-2xl p-6 md:p-8 mb-10 bg-white/70 backdrop-blur-sm border border-cream-200 shadow">
          <h2 className="text-xl md:text-2xl font-semibold text-center mb-6">
            <span className="bg-gradient-to-r from-navy to-steel-600 bg-clip-text text-transparent">Comment faire ?</span> C'est simple !
          </h2>
          
          <div className="grid md:grid-cols-3 gap-5 md:gap-6 max-w-4xl mx-auto">
            <div className="text-center md:text-left">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mx-auto md:mx-0 mb-3 ring-1 ring-navy-200 bg-navy-50 text-navy font-bold">
                <span className="text-base md:text-lg">1</span>
              </div>
              <h3 className="text-base md:text-lg font-semibold mb-1">Cherchez sur Facebook</h3>
              <p className="text-sm md:text-base text-steel">Faites votre recherche normale sur Facebook Marketplace</p>
            </div>
            
            <div className="text-center md:text-left">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mx-auto md:mx-0 mb-3 ring-1 ring-steel-200 bg-steel-50 text-steel-700 font-bold">
                <span className="text-base md:text-lg">2</span>
              </div>
              <h3 className="text-base md:text-lg font-semibold mb-1">Copiez l'URL</h3>
              <p className="text-sm md:text-base text-steel">Copiez l'adresse de la page de résultats</p>
            </div>
            
            <div className="text-center md:text-left">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mx-auto md:mx-0 mb-3 ring-1 ring-green-200 bg-green-50 text-green-700 font-bold">
                <span className="text-base md:text-lg">3</span>
              </div>
              <h3 className="text-base md:text-lg font-semibold mb-1">Récupérez Excel</h3>
              <p className="text-sm md:text-base text-steel">Téléchargez votre fichier avec toutes les données</p>
            </div>
          </div>
        </div>

        {/* Formulaire principal */}
        <div id="scraping-form" className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8 border border-cream-200">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="url" className="block text-sm font-semibold text-navy-700">
                    URL de la recherche Facebook Marketplace
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
                          title: "⭐ Favori chargé",
                          description: `"${favorite.name}" a été chargé`,
                        });
                      }}
                      onManageClick={() => setShowFavoritesManager(true)}
                      selectedUrl={url}
                      placeholder="Charger un favori"
                      className="h-8 text-xs"
                    />
                  )}
                </div>
                <div className="relative">
                  <input
                    id="url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.facebook.com/marketplace/..."
                    className="w-full h-12 border border-cream-300 rounded-xl px-4 pr-12 text-base focus:ring-2 focus:ring-navy focus:border-navy"
                    required
                    disabled={loading || pollingLoading}
                  />
                  {url.trim() && isAuthenticated() && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <FavoriteButton
                        url={url}
                        type="marketplace"
                        defaultName={`Recherche Marketplace`}
                        metadata={{ maxItems }}
                        size="md"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="maxItems" className="block text-sm font-semibold text-navy-700 mb-2">
                  Nombre maximum d'annonces à extraire
                </label>
                <input
                  id="maxItems"
                  type="number"
                  value={maxItems}
                  onChange={(e) => setMaxItems(parseInt(e.target.value) || 10)}
                  min="1"
                  max="500"
                  className="w-full h-12 border border-cream-300 rounded-xl px-4 text-base focus:ring-2 focus:ring-navy focus:border-navy"
                  disabled={loading || pollingLoading}
                />
              </div>

              {/* Options avancées */}
              <div className="grid md:grid-cols-2 gap-4 bg-cream-50 rounded-2xl p-4 border border-cream-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deepScrape}
                    onChange={(e) => setDeepScrape(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-cream-300 text-navy focus:ring-navy"
                    disabled={loading || pollingLoading}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-navy">Extraction approfondie</span>
                    <span className="block text-xs text-steel mt-0.5">Plus complet (plus de données), peut prendre un peu plus de temps.</span>
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={getProfileUrls}
                    onChange={(e) => setGetProfileUrls(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-cream-300 text-navy focus:ring-navy"
                    disabled={loading || pollingLoading}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-navy">Récupérer les profils vendeurs</span>
                    <span className="block text-xs text-steel mt-0.5">Ajoute les URLs des profils vendeurs pour chaque annonce.</span>
                  </span>
                </label>
              </div>

              {/* Cost Estimator - Only for authenticated users */}
              {isAuthenticated() && url && maxItems > 0 && (
                <CostEstimator
                  serviceType="marketplace"
                  itemCount={maxItems}
                  className="mt-4"
                  onEstimateChange={setCreditEstimate}
                />
              )}

              <Button
                type="submit"
                className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-navy to-steel-600 hover:from-navy-400 hover:to-steel-700"
                disabled={loading || pollingLoading}
              >
                {loading || pollingLoading ? "Extraction en cours..." : "Lancer l'extraction"}
              </Button>
            </form>
          </div>

          {(loading || pollingLoading) && (
            <div className="mt-8">
              <ScrapeProgress 
                percent={progress} 
                stepLabel={status}
              />
            </div>
          )}
        </div>
      </section>

      {/* Insufficient Credits Modal */}
      <InsufficientCreditsModal
        open={showInsufficientModal}
        onOpenChange={setShowInsufficientModal}
        requiredCredits={creditEstimate?.cost || 0}
        currentBalance={(creditEstimate?.cost || 0) - (creditEstimate?.shortfall || 0)}
        serviceType="marketplace"
        itemCount={maxItems}
      />

      {/* Results Section */}
      {scrapeDone && (
        <section className="w-full max-w-7xl mx-auto px-4 py-10">
          {/* Preview Items */}
          {previewItems && previewItems.length > 0 && (
            <div className="w-full mb-8 bg-white rounded-3xl p-8 border border-cream-200 shadow-xl">
              <h3 className="text-2xl font-bold mb-6 tracking-tight">Aperçu des résultats</h3>
              <ScrapePreview items={previewItems} />
            </div>
          )}

          {/* Download Section */}
          <div className="w-full bg-white rounded-3xl p-8 border border-cream-200 shadow-xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h3 className="text-2xl font-bold tracking-tight mb-2">
                  {isPaid ? 'Téléchargez vos résultats' : 'Résultats disponibles'}
                </h3>
                <p className="text-steel text-lg">
                  {stats?.nbItems ? `${stats.nbItems} éléments trouvés` : 'Prêt pour le téléchargement'}
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                {isPaid ? (
                  <>
                    <Button 
                      onClick={() => exportData('excel')} 
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-lg"
                    >
                      <FileSpreadsheet className="w-5 h-5 mr-2" />
                      Excel
                    </Button>
                    <Button 
                      onClick={() => exportData('csv')} 
                      className="bg-gold-500 hover:bg-gold-600 text-white px-6 py-3 text-lg"
                    >
                      <FileText className="w-5 h-5 mr-2" />
                      CSV
                    </Button>
                  </>
                ) : (
                  <div className="text-center p-6 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <p className="text-yellow-800 font-semibold">
                      ⚠️ Une erreur s'est produite avec le paiement. Veuillez contacter le support.
                    </p>
                  </div>
                )}
                <Button 
                  variant="outline" 
                  onClick={resetScrape}
                  className="px-6 py-3 text-lg"
                >
                  <RotateCw className="w-5 h-5 mr-2" />
                  Recommencer
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Section Problème/Solution très claire */}
      <section className="w-full py-20 bg-cream-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Problème */}
            <div>
              <h2 className="text-4xl font-bold text-navy mb-8">
                😤 Vous perdez des heures à faire ça ?
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-6 bg-red-50 border border-red-200 rounded-2xl">
                  <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-sm font-bold">❌</span>
                  </div>
                  <div>
                    <p className="font-semibold text-red-800">Copier-coller chaque annonce une par une</p>
                    <p className="text-red-600 text-sm mt-1">3 heures pour 100 annonces...</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-6 bg-red-50 border border-red-200 rounded-2xl">
                  <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-sm font-bold">❌</span>
                  </div>
                  <div>
                    <p className="font-semibold text-red-800">Risquer d'oublier des données importantes</p>
                    <p className="text-red-600 text-sm mt-1">Prix, contact, localisation manqués</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-6 bg-red-50 border border-red-200 rounded-2xl">
                  <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-sm font-bold">❌</span>
                  </div>
                  <div>
                    <p className="font-semibold text-red-800">Données non organisées pour vos analyses</p>
                    <p className="text-red-600 text-sm mt-1">Impossible de faire des graphiques</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Solution */}
            <div>
              <h2 className="text-4xl font-bold text-navy mb-8">
                ⚡ Notre solution automatique !
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-6 bg-green-50 border border-green-200 rounded-2xl">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-800">Extraction automatique de TOUTES les annonces</p>
                    <p className="text-green-600 text-sm mt-1">3 minutes pour 1000+ annonces</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-6 bg-green-50 border border-green-200 rounded-2xl">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-800">Toutes les données capturées automatiquement</p>
                    <p className="text-green-600 text-sm mt-1">Prix, description, contact, images, localisation</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-6 bg-green-50 border border-green-200 rounded-2xl">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-800">Excel parfaitement organisé</p>
                    <p className="text-green-600 text-sm mt-1">Prêt pour tableaux de bord et analyses</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cas d'usage simplifiés */}
      <section className="w-full py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-navy mb-6">
              Parfait pour tous les professionnels
            </h2>
            <p className="text-xl text-steel max-w-3xl mx-auto">
              Que vous soyez dans l'immobilier, l'automobile, le e-commerce ou les études de marché
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Immobilier */}
            <div className="group bg-gradient-to-br from-navy-50 to-navy-100 rounded-3xl p-8 border border-navy-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-navy rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Home className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-navy mb-4">Immobilier</h3>
              <p className="text-navy-700 mb-6">
                Surveillez les prix du marché et trouvez les meilleures opportunités
              </p>
              <div className="bg-white/80 rounded-xl p-4">
                <p className="text-sm font-semibold text-navy">
                  "500+ annonces analysées en 3 minutes au lieu de 2 jours"
                </p>
              </div>
            </div>

            {/* E-commerce */}
            <div className="group bg-gradient-to-br from-green-50 to-green-100 rounded-3xl p-8 border border-green-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-navy mb-4">E-commerce</h3>
              <p className="text-navy-700 mb-6">
                Analysez la concurrence et optimisez vos prix de vente
              </p>
              <div className="bg-white/80 rounded-xl p-4">
                <p className="text-sm font-semibold text-green-700">
                  "Surveillance concurrentielle automatisée"
                </p>
              </div>
            </div>

            {/* Automobile */}
            <div className="group bg-gradient-to-br from-steel-50 to-steel-100 rounded-3xl p-8 border border-steel-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-steel-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Car className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-navy mb-4">Automobile</h3>
              <p className="text-navy-700 mb-6">
                Évaluez la cote des véhicules et trouvez les meilleures affaires
              </p>
              <div className="bg-white/80 rounded-xl p-4">
                <p className="text-sm font-semibold text-steel-700">
                  "Comparaison de 1000+ véhicules instantanée"
                </p>
              </div>
            </div>

            {/* Études de marché */}
            <div className="group bg-gradient-to-br from-gold-50 to-gold-100 rounded-3xl p-8 border border-gold-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gold-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-navy mb-4">Études</h3>
              <p className="text-navy-700 mb-6">
                Réalisez des études de marché complètes avec des données réelles
              </p>
              <div className="bg-white/80 rounded-xl p-4">
                <p className="text-sm font-semibold text-gold-700">
                  "Rapports clients alimentés par des données réelles"
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Témoignages/Garanties */}
      <section className="w-full py-20 bg-gradient-to-r from-navy to-navy">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-12">
            Pourquoi nous faire confiance ?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur rounded-3xl p-8 border border-white/20">
              <div className="w-16 h-16 bg-navy rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">100% Sécurisé</h3>
              <p className="text-steel-200">
                Aucune donnée stockée. Chiffrement de bout en bout pour protéger vos recherches.
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-3xl p-8 border border-white/20">
              <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">99.9% Fiable</h3>
              <p className="text-steel-200">
                Infrastructure robuste qui traite des milliers de requêtes chaque jour sans interruption.
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-3xl p-8 border border-white/20">
              <div className="w-16 h-16 bg-steel-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Support Expert</h3>
              <p className="text-steel-200">
                Équipe technique malgache disponible pour vous aider à optimiser vos extractions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ ultra simplifiée */}
      <section className="w-full py-20 bg-cream-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-navy mb-4">
              Questions fréquentes
            </h2>
            <p className="text-xl text-steel">Tout ce que vous devez savoir</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-cream-200">
              <h3 className="text-xl font-bold text-navy mb-4">
                ❓ Quelles données j'obtiens ?
              </h3>
              <p className="text-steel leading-relaxed">
                Tout ! Titres, prix, descriptions, images, localisations, contacts, URLs... 
                Parfaitement organisé dans un fichier Excel prêt à utiliser.
              </p>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-cream-200">
              <h3 className="text-xl font-bold text-navy mb-4">
                ⚡ C'est vraiment si rapide ?
              </h3>
              <p className="text-steel leading-relaxed">
                Oui ! 3 minutes en moyenne pour extraire des centaines d'annonces, 
                au lieu des heures que ça vous prendrait manuellement.
              </p>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-cream-200">
              <h3 className="text-xl font-bold text-navy mb-4">
                🔒 Mes données sont protégées ?
              </h3>
              <p className="text-steel leading-relaxed">
                Absolument. Nous ne stockons rien. Vos URL et données sont traitées en temps réel 
                puis supprimées automatiquement.
              </p>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-cream-200">
              <h3 className="text-xl font-bold text-navy mb-4">
                💰 Dois-je m'abonner ?
              </h3>
              <p className="text-steel leading-relaxed">
                Non ! Pas d'abonnement. Vous payez uniquement ce que vous utilisez. 
                Idéal pour tester ou pour une utilisation ponctuelle.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trial Popup - shown once per session for guests */}
      <Helmet>
        <title>Marketplace</title>
        <meta name="description" content="Description de la page Marketplace" />
      </Helmet>
      <TrialPopup
        open={showTrial}
        onOpenChange={(open) => {
          setShowTrial(open);
          if (open) {
            sessionStorage.setItem('trialPopupShown', 'true');
          }
        }}
      />

      <FavoritesManager
        open={showFavoritesManager}
        onOpenChange={setShowFavoritesManager}
        defaultTab="marketplace"
      />
    </div>
    </>
  );
}