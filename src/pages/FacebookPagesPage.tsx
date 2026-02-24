import React, { useState, useEffect } from "react";
import { Facebook, Plus, X, Calendar, FileText, Image, ArrowLeft, MessageSquare, Zap, TrendingUp, Star } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { useFacebookPagesPolling } from "@/hooks/useFacebookPagesPolling";
import FacebookPagesProgress from "@/components/FacebookPagesProgress";
import { useToast } from "@/components/ui/use-toast";
import { CostEstimator } from "@/components/CostEstimator";
import { InsufficientCreditsModal } from "@/components/InsufficientCreditsModal";
import { Helmet } from "react-helmet";
import { FavoriteButton, FavoriteSelector, FavoritesManager } from "@/components/favorites";
import { useFavorites, Favorite } from "@/hooks/useFavorites";

export default function FacebookPagesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [urls, setUrls] = useState<string[]>([""]);
  const [extractInfo, setExtractInfo] = useState(true);
  const [extractPosts, setExtractPosts] = useState(true);
  const [postsLimit, setPostsLimit] = useState(50);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [extractComments, setExtractComments] = useState(false);
  const [commentsLimit, setCommentsLimit] = useState(50);
  const [singlePostUrl, setSinglePostUrl] = useState("");
  const [extractSinglePost, setExtractSinglePost] = useState(false);
  const [incrementalMode, setIncrementalMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [creditEstimate, setCreditEstimate] = useState<{
    cost: number;
    hasEnough: boolean;
    shortfall: number;
  } | null>(null);
  const [showFavoritesManager, setShowFavoritesManager] = useState(false);

  const { status, loading: pollingLoading, error: pollingError } = useFacebookPagesPolling(sessionId);
  const { defaultFavorite } = useFavorites('facebook_page');

  const MAX_PAGES = 20;

  useEffect(() => {
    if (isAuthenticated() && !sessionId) {
      const pendingScrape = sessionStorage.getItem("facebook_pages_pending_scrape");
      if (pendingScrape) {
        try {
          const data = JSON.parse(pendingScrape);
          const isRecent = Date.now() - data.timestamp < 30 * 60 * 1000;

          if (isRecent && data.urls && data.urls.length > 0) {
            setUrls(data.urls);
            setExtractInfo(data.extractInfo !== undefined ? data.extractInfo : true);
            setExtractPosts(data.extractPosts !== undefined ? data.extractPosts : true);
            setPostsLimit(data.postsLimit || 50);
            setDateFrom(data.dateFrom || "");
            setDateTo(data.dateTo || "");

            sessionStorage.removeItem("facebook_pages_pending_scrape");

            setTimeout(async () => {
              if (!data.extractInfo && !data.extractPosts) {
                toast({
                  title: "Erreur",
                  description: "Veuillez sélectionner au moins un type de données à extraire",
                  variant: "destructive",
                });
                return;
              }

              setLoading(true);

              try {
                const response = await api.post("/scrape/facebook-pages", {
                  urls: data.urls,
                  extractInfo: data.extractInfo,
                  extractPosts: data.extractPosts,
                  postsLimit: data.extractPosts ? data.postsLimit : undefined,
                  dateFrom: data.extractPosts && data.dateFrom ? data.dateFrom : undefined,
                  dateTo: data.extractPosts && data.dateTo ? data.dateTo : undefined,
                  packId: "pack-standard",
                });

                const responseData = response.data;
                const sessionIdFromResponse = responseData.data?.sessionId || responseData.sessionId;

                if (sessionIdFromResponse) {
                  setSessionId(sessionIdFromResponse);
                  toast({
                    title: "✅ Extraction lancée",
                    description: "Votre extraction a été lancée avec succès !",
                  });
                } else {
                  throw new Error("Session ID non reçu du serveur");
                }
              } catch (error: any) {
                console.error("Error:", error);

                let errorMessage = "Une erreur est survenue";
                if (error.response?.status === 409) {
                  errorMessage = "Une extraction est déjà en cours. Veuillez attendre qu'elle se termine avant d'en lancer une nouvelle.";
                } else if (error.response?.status === 402) {
                  errorMessage = "Crédits insuffisants. Veuillez recharger votre solde.";
                } else if (error.response?.data?.message) {
                  errorMessage = error.response.data.message;
                } else if (error.message) {
                  errorMessage = error.message;
                }

                toast({
                  title: "❌ Erreur",
                  description: errorMessage,
                  variant: "destructive",
                });
              } finally {
                setLoading(false);
              }
            }, 1000);
          } else {
            sessionStorage.removeItem("facebook_pages_pending_scrape");
          }
        } catch (error) {
          console.error("Erreur lors de la restauration des données d'extraction:", error);
          sessionStorage.removeItem("facebook_pages_pending_scrape");
        }
      }
    }
  }, [isAuthenticated, sessionId, toast, navigate]);

  const addUrl = () => {
    if (urls.length < MAX_PAGES) {
      setUrls([...urls, ""]);
    }
  };

  const removeUrl = (index: number) => setUrls(urls.filter((_, i) => i !== index));

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated()) {
      const validUrls = urls.filter((u) => u.trim());
      sessionStorage.setItem(
        "facebook_pages_pending_scrape",
        JSON.stringify({
          urls: validUrls,
          extractInfo,
          extractPosts,
          postsLimit,
          dateFrom,
          dateTo,
          timestamp: Date.now(),
        })
      );

      toast({
        title: "🔒 Connexion requise",
        description:
          "Vous devez être connecté pour lancer une extraction. Redirection vers la page de connexion...",
        variant: "destructive",
      });

      setTimeout(() => {
        navigate("/login?redirect=/facebook-pages");
      }, 2000);
      return;
    }

    setLoading(true);

    const validUrls = urls.filter((u) => u.trim());

    if (validUrls.length === 0) {
      alert("Veuillez entrer au moins une URL valide");
      setLoading(false);
      return;
    }

    if (!extractInfo && !extractPosts) {
      alert("Veuillez sélectionner au moins un type de données à extraire");
      setLoading(false);
      return;
    }

    try {
      const response = await api.post("/scrape/facebook-pages", {
        urls: extractSinglePost && singlePostUrl ? [singlePostUrl] : validUrls,
        extractInfo: !extractSinglePost && extractInfo,
        extractPosts: extractSinglePost || extractPosts,
        extractComments: extractComments,
        postsLimit: extractPosts ? postsLimit : (extractSinglePost ? 1 : undefined),
        commentsLimit: extractComments ? commentsLimit : undefined,
        singlePostUrl: extractSinglePost ? singlePostUrl : undefined,
        dateFrom: extractPosts && dateFrom ? dateFrom : undefined,
        dateTo: extractPosts && dateTo ? dateTo : undefined,
        incrementalMode: incrementalMode,
        packId: "pack-standard",
      });

      const data = response.data;
      console.log("Scraping started:", data);

      const sessionIdFromResponse = data.data?.sessionId || data.sessionId;
      if (sessionIdFromResponse) {
        setSessionId(sessionIdFromResponse);
      } else {
        throw new Error("Session ID non reçu du serveur");
      }
    } catch (error: any) {
      console.error("Error:", error);

      let errorMessage = "Une erreur est survenue";

      if (error.response?.status === 409) {
        errorMessage = "Une extraction est déjà en cours. Veuillez attendre qu'elle se termine avant d'en lancer une nouvelle.";
      } else if (error.response?.status === 402) {
        errorMessage = "Crédits insuffisants. Veuillez recharger votre solde.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "❌ Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSessionId(null);
    setUrls([""]);
    setExtractInfo(true);
    setExtractPosts(true);
    setPostsLimit(20);
    setDateFrom("");
    setDateTo("");
  };

  const handleDownload = () => {
    if (sessionId) {
      navigate(`/dashboard/facebook-pages?session=${sessionId}`);
    }
  };

  if (loading && !sessionId) {
    return (
      <>
        <Helmet>
          <title>Scraper Pages Facebook | Analyse concurrence & export Excel | EasyScrapy</title>
          <meta
            name="description"
            content="Analysez les publications et l'engagement de n'importe quelle Page Facebook. Comparez vos concurrents, exportez les données en Excel. Sans connecter votre compte."
          />
        </Helmet>
        <div className="min-h-screen bg-cream-50 px-4 py-10">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-navy hover:text-navy mb-6 font-semibold"
            >
              <ArrowLeft className="w-5 h-5" />
              Retour à l'accueil
            </button>

            <div className="bg-white rounded-3xl shadow-lg p-8 border border-cream-300">
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-navy mb-6"></div>
                <h2 className="text-2xl font-bold text-navy mb-2">Initialisation de la récupération des informations souhaitées</h2>
                <p className="text-steel text-center">
                  Une fois terminé, vous serez redirigé vers la page avec toutes les informations
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (sessionId && status) {
    const statusData: any = (status as any).data || status;
    const progress = statusData.progress || 0;
    const overallStatus = statusData.overallStatus || "RUNNING";
    const subSessions = statusData.subSessions || [];

    return (
      <div className="min-h-screen bg-cream-50 px-4 py-10">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-navy hover:text-navy mb-6 font-semibold"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour à l'accueil
          </button>

          <FacebookPagesProgress
            progress={progress}
            overallStatus={overallStatus}
            subSessions={subSessions}
          />

          {overallStatus === "SUCCEEDED" && (
            <div className="mt-6 flex gap-4">
              <button
                onClick={handleDownload}
                className="flex-1 py-4 bg-gradient-to-r from-navy to-navy text-white font-bold rounded-xl hover:shadow-lg transition-all"
              >
                Voir les résultats et télécharger
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-4 bg-cream-200 text-navy-700 font-bold rounded-xl hover:bg-cream-300 transition-all"
              >
                Nouvelle extraction
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 px-4 py-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-steel-200 hover:text-navy transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Retour</span>
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-navy/10 text-navy rounded-full text-xs font-semibold">
            <Facebook className="w-3.5 h-3.5" />
            Facebook Pages
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr,380px] gap-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-cream-300 p-5">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-navy mb-1">Configuration de l'extraction</h2>
              <p className="text-sm text-steel">Configurez les pages et les données à extraire</p>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-navy-700 uppercase tracking-wide">
                  Pages Facebook ({urls.length}/{MAX_PAGES})
                </label>
                {isAuthenticated() && (
                  <FavoriteSelector
                    type="facebook_page"
                    onSelect={(favorite: Favorite) => {
                      const newUrls = [...urls.filter(u => u.trim())];
                      if (!newUrls.includes(favorite.url)) {
                        if (newUrls.length === 1 && !newUrls[0]) {
                          setUrls([favorite.url]);
                        } else if (newUrls.length < MAX_PAGES) {
                          setUrls([...newUrls, favorite.url]);
                        }
                      }
                      toast({
                        title: "⭐ Favori chargé",
                        description: `"${favorite.name}" ajouté à la liste`,
                      });
                    }}
                    onManageClick={() => setShowFavoritesManager(true)}
                    placeholder="Charger un favori"
                    className="h-8 text-xs"
                  />
                )}
              </div>
              <div className="rounded-lg border border-dashed border-gold-300 bg-gold-50 px-3 py-2">
                <div className="flex flex-wrap gap-2">
                  {urls.map((url, index) => (
                    <div
                      key={index}
                      className="group flex items-center gap-1 rounded-full bg-gold-100 px-2 py-1 shadow-sm border border-gold-200 max-w-full"
                    >
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gold-500 text-[11px] font-semibold text-white flex-shrink-0">
                        {index + 1}
                      </span>
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => updateUrl(index, e.target.value)}
                        placeholder="https://facebook.com/page-name"
                        className="flex-1 min-w-[140px] bg-transparent px-1 py-1 text-xs text-navy placeholder:text-steel-200 focus:outline-none focus:ring-0"
                        required
                      />
                      {url.trim() && isAuthenticated() && (
                        <FavoriteButton
                          url={url}
                          type="facebook_page"
                          defaultName={url.split('/').filter(Boolean).pop() || 'Page Facebook'}
                          size="sm"
                          className="flex-shrink-0"
                        />
                      )}
                      {urls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeUrl(index)}
                          className="ml-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addUrl}
                    disabled={urls.length >= MAX_PAGES}
                    className={`inline-flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1 text-[11px] font-medium transition-colors ${
                      urls.length >= MAX_PAGES
                        ? "cursor-not-allowed border-cream-300 text-steel-200 bg-cream-100"
                        : "border-gold-300 text-gold-600 hover:border-gold-400 hover:bg-gold-50"
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    Ajouter une page
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-navy-700 mb-2 uppercase tracking-wide">
                Données à extraire
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label
                  className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    extractInfo ? "border-gold bg-gold-50" : "border-cream-300 hover:border-cream-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={extractInfo}
                    onChange={(e) => setExtractInfo(e.target.checked)}
                    className="w-4 h-4 text-navy"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-navy">Informations</div>
                    <div className="text-xs text-steel">Profil, stats</div>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    extractPosts ? "border-gold bg-gold-50" : "border-cream-300 hover:border-cream-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={extractPosts}
                    onChange={(e) => setExtractPosts(e.target.checked)}
                    className="w-4 h-4 text-navy-600"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-navy">Posts</div>
                    <div className="text-xs text-steel">Engagement</div>
                  </div>
                </label>
              </div>
            </div>

            {extractPosts && (
              <div className="mb-4 p-4 bg-cream-50 rounded-lg border border-cream-300">
                <h3 className="text-sm font-semibold text-navy mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gold" />
                  Options des posts
                </h3>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-navy-700 mb-1">Date début</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm bg-white border border-cream-300 text-navy rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-navy-700 mb-1">Date fin</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm bg-white border border-cream-300 text-navy rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-navy-700">Limite de posts</label>
                    <span className="text-sm font-bold text-gold-600">{postsLimit}</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={500}
                    step={10}
                    value={postsLimit}
                    onChange={(e) => setPostsLimit(Number(e.target.value))}
                    className="w-full h-2 bg-cream-200 rounded-lg appearance-none cursor-pointer accent-gold"
                  />
                  <div className="flex justify-between text-xs text-steel mt-1">
                    <span>10</span>
                    <span>500</span>
                  </div>
                </div>
              </div>
            )}

            {/* Option Scraping Incrémental */}
            {extractPosts && (
              <div className="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="incrementalMode"
                      checked={incrementalMode}
                      onChange={(e) => setIncrementalMode(e.target.checked)}
                      className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <label htmlFor="incrementalMode" className="flex items-center gap-2 cursor-pointer">
                      <Zap className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-semibold text-navy">
                        Mode incrémental
                      </span>
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Économies
                      </span>
                    </label>
                  </div>
                </div>
                {incrementalMode && (
                  <div className="mt-3 ml-8 p-3 bg-white rounded-lg border border-emerald-200">
                    <p className="text-xs text-navy-700">
                      <span className="font-semibold text-emerald-700">💡 Mode incrémental activé :</span> Seuls les <strong>nouveaux posts</strong> depuis votre dernière extraction seront récupérés. 
                      Cela réduit significativement le coût en crédits.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Option Commentaires */}
            {extractPosts && (
              <div className="mb-4 p-4 bg-cream-50 rounded-lg border border-cream-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="extractComments"
                      checked={extractComments}
                      onChange={(e) => setExtractComments(e.target.checked)}
                      className="w-5 h-5 text-steel-600 rounded focus:ring-steel"
                    />
                    <label htmlFor="extractComments" className="flex items-center gap-2 cursor-pointer">
                      <MessageSquare className="w-5 h-5 text-steel-600" />
                      <span className="text-sm font-semibold text-navy">
                        Extraire les commentaires des posts
                      </span>
                      <span className="text-xs bg-steel-100 text-steel-700 px-2 py-1 rounded-full font-medium">
                        +1 crédit/post
                      </span>
                    </label>
                  </div>
                </div>

                {extractComments && (
                  <div className="ml-8 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-navy-700">
                          Nombre de commentaires par post
                        </label>
                        <span className="text-sm font-bold text-steel-600">{commentsLimit}</span>
                      </div>
                      <select
                        value={commentsLimit}
                        onChange={(e) => setCommentsLimit(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm bg-white border border-cream-300 text-navy rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
                      >
                        <option value={20}>20 commentaires</option>
                        <option value={50}>50 commentaires</option>
                        <option value={100}>100 commentaires</option>
                        <option value={200}>200 commentaires</option>
                      </select>
                    </div>
                    <p className="text-xs text-steel bg-gold-50 p-2 rounded border border-gold-200">
                      💡 Les commentaires seront extraits automatiquement pour chaque post de la page
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Option Post Unique */}
            <div className="mb-4 p-4 bg-cream-50 rounded-lg border border-cream-300">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  id="extractSinglePost"
                  checked={extractSinglePost}
                  onChange={(e) => setExtractSinglePost(e.target.checked)}
                  className="w-5 h-5 text-gold-600 rounded focus:ring-gold-500"
                />
                <label htmlFor="extractSinglePost" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="w-5 h-5 text-gold-600" />
                  <span className="text-sm font-semibold text-navy">
                    Extraire un post spécifique uniquement
                  </span>
                </label>
              </div>

              {extractSinglePost && (
                <div className="ml-8 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-navy-700 mb-2">
                      URL du post Facebook
                    </label>
                    <input
                      type="url"
                      value={singlePostUrl}
                      onChange={(e) => setSinglePostUrl(e.target.value)}
                      placeholder="https://www.facebook.com/page/posts/123456789"
                      className="w-full px-3 py-2 text-sm bg-white border border-cream-300 text-navy rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="extractCommentsForSinglePost"
                      checked={extractComments}
                      onChange={(e) => setExtractComments(e.target.checked)}
                      className="w-4 h-4 text-steel-600 rounded"
                    />
                    <label htmlFor="extractCommentsForSinglePost" className="text-xs text-navy-700">
                      Extraire aussi les commentaires de ce post (+1 crédit)
                    </label>
                  </div>
                  <p className="text-xs text-steel bg-gold-50 p-2 rounded border border-gold-200">
                    💡 Utile pour analyser un post viral ou controversé en détail
                  </p>
                </div>
              )}
            </div>

            {isAuthenticated() && urls.filter((u) => u.trim()).length > 0 && (extractInfo || extractPosts) && (
              <div className="mb-4">
                <CostEstimator
                  serviceType="facebook_pages"
                  itemCount={
                    (extractInfo && !extractSinglePost ? urls.filter((u) => u.trim()).length : 0) +
                    (extractPosts && !extractSinglePost ? urls.filter((u) => u.trim()).length * postsLimit : 0) +
                    (extractSinglePost ? 1 : 0) +
                    (extractComments ? (extractSinglePost ? 1 : urls.filter((u) => u.trim()).length * postsLimit) : 0)
                  }
                  onEstimateChange={setCreditEstimate}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (!extractInfo && !extractPosts)}
              className="w-full py-3 bg-gradient-to-r from-gold to-gold-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Extraction en cours..." : "Lancer l'extraction"}
            </button>
          </form>

          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-cream-300 p-4">
              <h3 className="text-sm font-semibold text-navy mb-3">Aperçu de l'extraction</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-b border-cream-300">
                  <span className="text-xs text-steel">Pages à extraire</span>
                  <span className="text-sm font-bold text-gold-600">{urls.filter((u) => u.trim()).length}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-cream-300">
                  <span className="text-xs text-steel">Informations</span>
                  <span className={`text-xs font-semibold ${extractInfo ? "text-green-600" : "text-steel-200"}`}>
                    {extractInfo ? "✓ Activé" : "✗ Désactivé"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-cream-300">
                  <span className="text-xs text-steel">Posts</span>
                  <span className={`text-xs font-semibold ${extractPosts ? "text-green-600" : "text-steel-200"}`}>
                    {extractPosts ? "✓ Activé" : "✗ Désactivé"}
                  </span>
                </div>
                {extractPosts && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-xs text-steel">Limite posts</span>
                    <span className="text-sm font-bold text-gold-600">{postsLimit}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gold-50 rounded-xl border border-gold-200 p-4">
              <h3 className="text-sm font-semibold text-gold-700 mb-2">💡 Conseils</h3>
              <ul className="space-y-1.5 text-xs text-navy-700">
                <li className="flex items-start gap-2">
                  <span className="text-gold mt-0.5">•</span>
                  <span>Utilisez des URLs complètes de pages Facebook</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold mt-0.5">•</span>
                  <span>Maximum {MAX_PAGES} pages par extraction</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold mt-0.5">•</span>
                  <span>Les dates sont optionnelles pour les posts</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <InsufficientCreditsModal
        open={showInsufficientModal}
        onOpenChange={setShowInsufficientModal}
        requiredCredits={creditEstimate?.cost || 0}
        currentBalance={(creditEstimate?.cost || 0) - (creditEstimate?.shortfall || 0)}
        serviceType="facebook_pages"
        itemCount={
          (extractInfo ? urls.filter((u) => u.trim()).length : 0) +
          (extractPosts ? urls.filter((u) => u.trim()).length * postsLimit : 0)
        }
      />

      <FavoritesManager
        open={showFavoritesManager}
        onOpenChange={setShowFavoritesManager}
        defaultTab="facebook_page"
      />
    </div>
  );
}
