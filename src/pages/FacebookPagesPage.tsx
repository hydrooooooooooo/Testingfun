import React, { useState, useEffect } from "react";
import {
  Facebook,
  Plus,
  X,
  Calendar,
  FileText,
  MessageSquare,
  Zap,
  TrendingUp,
  Settings2,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { useFacebookPagesPolling } from "@/hooks/useFacebookPagesPolling";
import FacebookPagesProgress from "@/components/FacebookPagesProgress";
import { useToast } from "@/components/ui/use-toast";
import { CostEstimator } from "@/components/CostEstimator";
import { InsufficientCreditsModal } from "@/components/InsufficientCreditsModal";
import { FavoriteButton, FavoriteSelector, FavoritesManager } from "@/components/favorites";
import { Favorite } from "@/hooks/useFavorites";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [creditEstimate, setCreditEstimate] = useState<{
    cost: number;
    hasEnough: boolean;
    shortfall: number;
  } | null>(null);
  const [showFavoritesManager, setShowFavoritesManager] = useState(false);

  const { status, loading: pollingLoading } = useFacebookPagesPolling(sessionId);

  const MAX_PAGES = 20;

  // Restore pending scrape after login redirect
  useEffect(() => {
    if (isAuthenticated() && !sessionId) {
      const pending = sessionStorage.getItem("facebook_pages_pending_scrape");
      if (pending) {
        try {
          const data = JSON.parse(pending);
          if (Date.now() - data.timestamp < 30 * 60 * 1000 && data.urls?.length > 0) {
            setUrls(data.urls);
            setExtractInfo(data.extractInfo ?? true);
            setExtractPosts(data.extractPosts ?? true);
            setPostsLimit(data.postsLimit || 50);
            setDateFrom(data.dateFrom || "");
            setDateTo(data.dateTo || "");
          }
          sessionStorage.removeItem("facebook_pages_pending_scrape");
        } catch {
          sessionStorage.removeItem("facebook_pages_pending_scrape");
        }
      }
    }
  }, [isAuthenticated, sessionId]);

  const addUrl = () => {
    if (urls.length < MAX_PAGES) setUrls([...urls, ""]);
  };
  const removeUrl = (index: number) => setUrls(urls.filter((_, i) => i !== index));
  const updateUrl = (index: number, value: string) => {
    const next = [...urls];
    next[index] = value;
    setUrls(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated()) {
      toast({ title: "Connexion requise", description: "Vous devez être connecté.", variant: "destructive" });
      navigate("/login?redirect=/dashboard/facebook-pages");
      return;
    }

    const validUrls = urls.filter((u) => u.trim());
    if (validUrls.length === 0) {
      toast({ title: "Erreur", description: "Entrez au moins une URL.", variant: "destructive" });
      return;
    }
    if (!extractInfo && !extractPosts && !extractSinglePost) {
      toast({ title: "Erreur", description: "Sélectionnez au moins un type de données.", variant: "destructive" });
      return;
    }

    if (creditEstimate && !creditEstimate.hasEnough) {
      setShowInsufficientModal(true);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/scrape/facebook-pages", {
        urls: extractSinglePost && singlePostUrl ? [singlePostUrl] : validUrls,
        extractInfo: !extractSinglePost && extractInfo,
        extractPosts: extractSinglePost || extractPosts,
        extractComments,
        postsLimit: extractPosts ? postsLimit : extractSinglePost ? 1 : undefined,
        commentsLimit: extractComments ? commentsLimit : undefined,
        singlePostUrl: extractSinglePost ? singlePostUrl : undefined,
        dateFrom: extractPosts && dateFrom ? dateFrom : undefined,
        dateTo: extractPosts && dateTo ? dateTo : undefined,
        incrementalMode,
        packId: "pack-standard",
      });

      const sid = response.data.data?.sessionId || response.data.sessionId;
      if (sid) {
        setSessionId(sid);
        toast({ title: "Extraction lancée", description: "L'extraction est en cours..." });
      } else {
        throw new Error("Session ID non reçu");
      }
    } catch (error: any) {
      let msg = "Une erreur est survenue";
      if (error.response?.status === 409) msg = "Une extraction est déjà en cours.";
      else if (error.response?.status === 402) { msg = "Crédits insuffisants."; setShowInsufficientModal(true); }
      else if (error.response?.data?.message) msg = error.response.data.message;
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSessionId(null);
    setUrls([""]);
    setExtractInfo(true);
    setExtractPosts(true);
    setPostsLimit(50);
    setDateFrom("");
    setDateTo("");
    setExtractSinglePost(false);
    setSinglePostUrl("");
    setExtractComments(false);
  };

  const isRunning = loading || pollingLoading;
  const validCount = urls.filter((u) => u.trim()).length;

  // Loading spinner while initializing
  if (loading && !sessionId) {
    return (
      <div className="h-full bg-cream-50 p-4 sm:p-6 pt-12 md:pt-4">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-navy mb-4" />
          <p className="text-navy font-semibold">Initialisation...</p>
          <p className="text-sm text-steel mt-1">Préparation de l'extraction</p>
        </div>
      </div>
    );
  }

  // Progress view
  if (sessionId && status) {
    const statusData: any = (status as any).data || status;
    const progress = statusData.progress || 0;
    const overallStatus = statusData.overallStatus || "RUNNING";
    const subSessions = statusData.subSessions || [];

    return (
      <div className="h-full bg-cream-50 p-4 sm:p-6 space-y-5 pt-12 md:pt-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-steel/10 rounded-lg">
              <Facebook className="h-5 w-5 text-steel-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-navy">Extraction en cours</h1>
          </div>
        </div>

        <Card className="bg-white border-cream-300 shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <FacebookPagesProgress
              progress={progress}
              overallStatus={overallStatus}
              subSessions={subSessions}
            />
          </CardContent>
        </Card>

        {overallStatus === "SUCCEEDED" && (
          <div className="flex gap-3">
            <Button
              onClick={() => navigate(`/dashboard/facebook-pages-files?session=${sessionId}`)}
              className="flex-1 bg-navy hover:bg-navy-600"
            >
              Voir les résultats
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" onClick={handleReset} className="border-cream-300">
              Nouvelle extraction
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Main form
  return (
    <div className="h-full bg-cream-50 p-4 sm:p-6 space-y-5 pt-12 md:pt-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-steel/10 rounded-lg">
            <Facebook className="h-5 w-5 text-steel-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy">Facebook Pages</h1>
        </div>
        <p className="text-steel ml-12">
          Extrayez les informations et publications de pages Facebook
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr,320px] gap-4">
        {/* Form */}
        <Card className="bg-white border-cream-300 shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* URLs */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-navy-700">
                    Pages Facebook ({validCount}/{MAX_PAGES})
                  </label>
                  {isAuthenticated() && (
                    <FavoriteSelector
                      type="facebook_page"
                      onSelect={(fav: Favorite) => {
                        const existing = urls.filter((u) => u.trim());
                        if (!existing.includes(fav.url)) {
                          if (existing.length === 1 && !existing[0]) setUrls([fav.url]);
                          else if (existing.length < MAX_PAGES) setUrls([...existing, fav.url]);
                        }
                        toast({ title: "Favori chargé", description: `"${fav.name}" ajouté` });
                      }}
                      onManageClick={() => setShowFavoritesManager(true)}
                      placeholder="Favoris"
                      className="h-7 text-xs"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  {urls.map((url, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-steel/10 text-xs font-semibold text-steel-600 flex-shrink-0">
                        {i + 1}
                      </span>
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => updateUrl(i, e.target.value)}
                        placeholder="https://facebook.com/page-name"
                        className="flex-1 h-10 border border-cream-300 rounded-lg px-3 text-sm focus:ring-2 focus:ring-navy/30 focus:border-navy bg-cream-50"
                        required
                        disabled={isRunning}
                      />
                      {url.trim() && isAuthenticated() && (
                        <FavoriteButton
                          url={url}
                          type="facebook_page"
                          defaultName={url.split("/").filter(Boolean).pop() || "Page Facebook"}
                          size="sm"
                        />
                      )}
                      {urls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeUrl(i)}
                          className="h-7 w-7 flex items-center justify-center rounded-md text-red-400 hover:bg-red-50 transition-colors flex-shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addUrl}
                  disabled={urls.length >= MAX_PAGES}
                  className="mt-2 flex items-center gap-1.5 text-xs font-medium text-steel hover:text-navy transition-colors disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter une page
                </button>
              </div>

              {/* Data type toggles */}
              <div>
                <label className="text-sm font-medium text-navy-700 mb-1.5 block">Données à extraire</label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`flex items-center gap-2.5 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      extractInfo ? "border-navy bg-navy/5" : "border-cream-300 hover:border-cream-400"
                    }`}
                  >
                    <input type="checkbox" checked={extractInfo} onChange={(e) => setExtractInfo(e.target.checked)} className="w-4 h-4 text-navy rounded" />
                    <div>
                      <p className="text-sm font-medium text-navy">Informations</p>
                      <p className="text-xs text-steel">Profil, stats de la page</p>
                    </div>
                  </label>
                  <label
                    className={`flex items-center gap-2.5 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      extractPosts ? "border-navy bg-navy/5" : "border-cream-300 hover:border-cream-400"
                    }`}
                  >
                    <input type="checkbox" checked={extractPosts} onChange={(e) => setExtractPosts(e.target.checked)} className="w-4 h-4 text-navy rounded" />
                    <div>
                      <p className="text-sm font-medium text-navy">Publications</p>
                      <p className="text-xs text-steel">Posts et engagement</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Posts options */}
              {extractPosts && (
                <div className="bg-cream-50 rounded-lg p-3 border border-cream-200 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-navy-700 mb-1 block">Date début</label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm bg-white border border-cream-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-navy-700 mb-1 block">Date fin</label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm bg-white border border-cream-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-navy-700">Limite de posts</label>
                      <span className="text-sm font-bold text-navy">{postsLimit}</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={500}
                      step={10}
                      value={postsLimit}
                      onChange={(e) => setPostsLimit(Number(e.target.value))}
                      className="w-full h-2 bg-cream-200 rounded-lg appearance-none cursor-pointer accent-navy"
                    />
                    <div className="flex justify-between text-[10px] text-steel mt-0.5">
                      <span>10</span>
                      <span>500</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Advanced options toggle */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-steel hover:text-navy transition-colors"
              >
                <Settings2 className="h-4 w-4" />
                Options avancées
                <span className="text-xs">({showAdvanced ? "masquer" : "afficher"})</span>
              </button>

              {showAdvanced && (
                <div className="space-y-3">
                  {/* Incremental mode */}
                  {extractPosts && (
                    <label className="flex items-start gap-2.5 p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={incrementalMode}
                        onChange={(e) => setIncrementalMode(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-green-600 rounded"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-navy">Mode incrémental</p>
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                            <TrendingUp className="w-2.5 h-2.5" />
                            Économies
                          </span>
                        </div>
                        <p className="text-xs text-steel mt-0.5">Récupère uniquement les nouveaux posts</p>
                      </div>
                    </label>
                  )}

                  {/* Comments */}
                  {extractPosts && (
                    <div className="p-3 bg-cream-50 border border-cream-200 rounded-lg space-y-2">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={extractComments}
                          onChange={(e) => setExtractComments(e.target.checked)}
                          className="mt-0.5 w-4 h-4 text-navy rounded"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-navy">Commentaires</p>
                            <span className="text-[10px] bg-cream-200 text-steel-600 px-1.5 py-0.5 rounded-full font-medium">+1 crédit/post</span>
                          </div>
                          <p className="text-xs text-steel mt-0.5">Extraire les commentaires de chaque post</p>
                        </div>
                      </label>
                      {extractComments && (
                        <div className="ml-7">
                          <select
                            value={commentsLimit}
                            onChange={(e) => setCommentsLimit(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 text-sm bg-white border border-cream-300 rounded-lg"
                          >
                            <option value={20}>20 commentaires/post</option>
                            <option value={50}>50 commentaires/post</option>
                            <option value={100}>100 commentaires/post</option>
                            <option value={200}>200 commentaires/post</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Single post */}
                  <div className="p-3 bg-cream-50 border border-cream-200 rounded-lg space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={extractSinglePost}
                        onChange={(e) => setExtractSinglePost(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-navy rounded"
                      />
                      <div>
                        <p className="text-sm font-medium text-navy">Post spécifique uniquement</p>
                        <p className="text-xs text-steel mt-0.5">Analyser un seul post en détail</p>
                      </div>
                    </label>
                    {extractSinglePost && (
                      <div className="ml-7 space-y-2">
                        <input
                          type="url"
                          value={singlePostUrl}
                          onChange={(e) => setSinglePostUrl(e.target.value)}
                          placeholder="https://www.facebook.com/page/posts/123456"
                          className="w-full h-9 px-2.5 text-sm bg-white border border-cream-300 rounded-lg"
                        />
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={extractComments}
                            onChange={(e) => setExtractComments(e.target.checked)}
                            className="w-3.5 h-3.5 text-navy rounded"
                          />
                          <span className="text-xs text-navy-700">Inclure les commentaires (+1 crédit)</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Cost estimator */}
              {isAuthenticated() && validCount > 0 && (extractInfo || extractPosts || extractSinglePost) && (
                <CostEstimator
                  serviceType="facebook_pages"
                  itemCount={
                    (extractInfo && !extractSinglePost ? validCount : 0) +
                    (extractPosts && !extractSinglePost ? validCount * postsLimit : 0) +
                    (extractSinglePost ? 1 : 0) +
                    (extractComments ? (extractSinglePost ? 1 : validCount * postsLimit) : 0)
                  }
                  onEstimateChange={setCreditEstimate}
                />
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11 font-semibold bg-navy hover:bg-navy-600"
                disabled={isRunning || (!extractInfo && !extractPosts && !extractSinglePost)}
              >
                {isRunning ? "Extraction en cours..." : "Lancer l'extraction"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sidebar summary */}
        <div className="space-y-4">
          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-navy">Récapitulatif</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between py-1.5 border-b border-cream-200">
                <span className="text-xs text-steel">Pages</span>
                <span className="text-sm font-semibold text-navy">{validCount}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-cream-200">
                <span className="text-xs text-steel">Informations</span>
                <span className={`text-xs font-medium ${extractInfo ? "text-green-600" : "text-steel"}`}>
                  {extractInfo ? "Oui" : "Non"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-cream-200">
                <span className="text-xs text-steel">Publications</span>
                <span className={`text-xs font-medium ${extractPosts ? "text-green-600" : "text-steel"}`}>
                  {extractPosts ? "Oui" : "Non"}
                </span>
              </div>
              {extractPosts && (
                <div className="flex items-center justify-between py-1.5 border-b border-cream-200">
                  <span className="text-xs text-steel">Limite posts</span>
                  <span className="text-sm font-semibold text-navy">{postsLimit}</span>
                </div>
              )}
              {extractComments && (
                <div className="flex items-center justify-between py-1.5 border-b border-cream-200">
                  <span className="text-xs text-steel">Commentaires</span>
                  <span className="text-xs font-medium text-green-600">{commentsLimit}/post</span>
                </div>
              )}
              {incrementalMode && (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-steel">Mode</span>
                  <span className="text-xs font-medium text-green-600">Incrémental</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-cream-50 border-cream-300">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-navy mb-2">Conseils</p>
              <ul className="space-y-1 text-xs text-steel">
                <li>• URLs complètes de pages Facebook</li>
                <li>• Max {MAX_PAGES} pages par extraction</li>
                <li>• Les dates sont optionnelles</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <InsufficientCreditsModal
        open={showInsufficientModal}
        onOpenChange={setShowInsufficientModal}
        requiredCredits={creditEstimate?.cost || 0}
        currentBalance={(creditEstimate?.cost || 0) - (creditEstimate?.shortfall || 0)}
        serviceType="facebook_pages"
        itemCount={
          (extractInfo ? validCount : 0) + (extractPosts ? validCount * postsLimit : 0)
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
