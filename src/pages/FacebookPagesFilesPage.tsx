import React, { useState, useRef } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Facebook,
  Eye,
  Search,
  Calendar,
  Users,
  Heart,
  MessageCircle,
  Loader2,
  AlertCircle,
  ArrowLeft,
  FileText,
  TrendingUp,
  Globe,
  Download,
  FileSpreadsheet,
  BarChart3,
    X,
  Maximize2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Session } from '@/types';
import FacebookPagesSessionCard from '@/components/dashboard/FacebookPagesSessionCard';
import { FacebookPageItemsView, FacebookPostsView } from '@/components/dashboard/SessionItemsView';
import { Progress } from '@/components/ui/progress';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { PLANS } from '@/lib/plans';
import { toast } from '@/hooks/use-toast';
import axios from 'axios';
import { useApi } from '@/hooks/useApi';
import api from '@/services/api';
import ScrapePreview from '@/components/ScrapePreview';
import { FileDown, CheckCircle, RefreshCw, Home, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

const FacebookPagesFilesPage: React.FC = () => {
  const { userData, error, isLoading, fetchDashboardData } = useDashboard();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [dataTypeFilter, setDataTypeFilter] = useState<string>('all');
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentDownload, setCurrentDownload] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [selectedPageNames, setSelectedPageNames] = useState<string[]>([]);
  const [aiResultsByPage, setAiResultsByPage] = useState<Record<string, any>>({});
  const [activeAiPage, setActiveAiPage] = useState<string | null>(null);
  const [aiViewMode, setAiViewMode] = useState<'summary' | 'json'>('summary');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isAiResultExpanded, setIsAiResultExpanded] = useState(true);
  const [showAiConfirm, setShowAiConfirm] = useState(false);
  const [fbSummary, setFbSummary] = useState<{
    pages: number;
    totalFollowers: number;
    totalLikes: number;
    totalPosts: number;
    pagesDetails: Array<{
      pageName: string;
      url: string;
      followers: number;
      likes: number;
      posts: number;
    }>;
  } | null>(null);
  const [fbSummaryLoading, setFbSummaryLoading] = useState(false);
  const [fbSummaryError, setFbSummaryError] = useState<string | null>(null);
  
  // Ref pour le polling et pour tracker le dernier paramètre URL traité
  const pollingIntervalRef = useRef<number | null>(null);
  const lastUrlSessionParam = useRef<string | null>(null);

  // Récupérer le paramètre session de l'URL
  const searchParams = new URLSearchParams(location.search);
  const urlSessionParam = searchParams.get('session');

  // Initialiser selectedSessionId depuis l'URL au premier rendu ou quand l'URL change
  useEffect(() => {
    if (urlSessionParam && urlSessionParam !== lastUrlSessionParam.current) {
      lastUrlSessionParam.current = urlSessionParam;
      setSelectedSessionId(urlSessionParam);
      // Rafraîchir les données du dashboard pour avoir les dernières sessions
      fetchDashboardData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSessionParam]);

  // Calculer si la session sélectionnée existe dans les données
  const allSessions = userData?.sessions || [];
  const selectedSessionExists = selectedSessionId ? allSessions.some(s => 
    s.id === selectedSessionId && 
    s.scrape_type === 'facebook_pages' &&
    (s.status === 'completed' || s.status === 'running' || s.status === 'pending')
  ) : false;

  // Polling automatique si la session est sélectionnée mais pas encore trouvée
  useEffect(() => {
    // Ne pas faire de polling si pas de session sélectionnée ou si elle existe déjà
    if (!selectedSessionId || selectedSessionExists || isLoading) {
      if (pollingIntervalRef.current) {
        window.clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Démarrer le polling si la session n'existe pas encore
    if (!pollingIntervalRef.current) {
      pollingIntervalRef.current = window.setInterval(() => {
        fetchDashboardData();
      }, 3000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        window.clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessionId, selectedSessionExists, isLoading]);

  // Calculer les sessions Facebook Pages (avant les returns conditionnels)
  const sessions = userData?.sessions || [];
  const facebookPagesSessions = sessions.filter(s => 
    s.scrape_type === 'facebook_pages' &&
    (s.status === 'completed' || s.status === 'running' || s.status === 'pending')
  );

  // Polling sur l'endpoint de statut pour les sessions en cours (running/pending)
  // Ceci permet de mettre à jour le statut des commentaires côté backend
  useEffect(() => {
    if (!selectedSessionId || !userData) return;

    const selectedSession = facebookPagesSessions.find(s => s.id === selectedSessionId);
    if (!selectedSession) return;

    // Ne faire le polling que si la session est en cours
    if (selectedSession.status !== 'running' && selectedSession.status !== 'pending') return;

    let statusIntervalId: number | undefined;

    const fetchStatus = async () => {
      try {
        console.log(`🔄 [FB Files] Polling status for session ${selectedSessionId}...`);
        const response = await api.get(`/scrape/facebook-pages/${selectedSessionId}/status`);
        const data = response.data?.data || response.data;
        
        // Si la session est terminée, rafraîchir les données du dashboard
        if (data.sessionStatus === 'completed' || data.overallStatus === 'SUCCEEDED') {
          console.log(`✅ [FB Files] Session completed, refreshing dashboard...`);
          fetchDashboardData();
          if (statusIntervalId) {
            window.clearInterval(statusIntervalId);
            statusIntervalId = undefined;
          }
        }
      } catch (err: any) {
        console.error('❌ [FB Files] Error polling status:', err);
      }
    };

    // Premier appel immédiat
    fetchStatus();

    // Polling toutes les 5 secondes
    statusIntervalId = window.setInterval(fetchStatus, 5000);

    return () => {
      if (statusIntervalId) {
        window.clearInterval(statusIntervalId);
      }
    };
  }, [selectedSessionId, userData, facebookPagesSessions, fetchDashboardData]);

  // Ref pour tracker la dernière session pour laquelle on a fetch le summary
  const lastSummaryFetchedRef = useRef<string | null>(null);

  // Charger le résumé Facebook Pages pour la session sélectionnée (une seule fois, pas de polling)
  useEffect(() => {
    if (!selectedSessionId || !userData) {
      setFbSummary(null);
      setFbSummaryError(null);
      lastSummaryFetchedRef.current = null;
      return;
    }

    // Éviter de refetch si on a déjà fetch pour cette session
    if (lastSummaryFetchedRef.current === selectedSessionId) {
      return;
    }

    const selectedSession = facebookPagesSessions.find(s => s.id === selectedSessionId);
    if (!selectedSession) return;

    // Marquer comme fetched AVANT le fetch pour éviter les appels multiples
    lastSummaryFetchedRef.current = selectedSessionId;

    // Ne charger qu'une seule fois par session
    const fetchSummary = async () => {
      try {
        setFbSummaryLoading(true);
        setFbSummaryError(null);
        const response = await api.get(`/sessions/facebook-pages/${selectedSessionId}/summary`);
        setFbSummary(response.data);
      } catch (err: any) {
        // 404 = résumé pas encore disponible, on affiche juste des tirets
        if (err.response?.status !== 404) {
          console.error('Erreur chargement résumé FB Pages:', err);
          setFbSummaryError(err.response?.data?.message || 'Erreur lors du chargement du résumé');
        }
      } finally {
        setFbSummaryLoading(false);
      }
    };

    fetchSummary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessionId]);

  // Charger les résultats IA par page depuis la base pour la session sélectionnée
  useEffect(() => {
    if (!selectedSessionId || !userData) {
      // On ne conserve pas les résultats IA quand aucune session n'est sélectionnée
      setAiResultsByPage({});
      setActiveAiPage(null);
      return;
    }

    const selectedSession = facebookPagesSessions.find(s => s.id === selectedSessionId);
    if (!selectedSession) return;

    const fetchAiResults = async () => {
      try {
        const response = await api.get(`/sessions/facebook-pages/${selectedSession.id}/ai-analysis/by-page`, {
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        const perPage = response.data || {};

        // Ne remplace l'état que si la réponse contient réellement des données
        setAiResultsByPage(prev => {
          const hasData = perPage && Object.keys(perPage).length > 0;
          return hasData ? perPage : prev;
        });

        setActiveAiPage(prev => {
          const source = perPage && Object.keys(perPage).length > 0 ? perPage : aiResultsByPage;
          if (!source) return prev;
          const pageNames = Object.keys(source);
          if (!pageNames.length) return prev;
          if (prev && source[prev]) return prev;
          return pageNames[0];
        });
      } catch (err: any) {
        // 304 = Not Modified → on garde les données existantes
        if (err.response?.status === 304) {
          return;
        }
        // 404 ou aucun résultat IA enregistré : on laisse simplement l'état vide
        if (err.response?.status !== 404) {
          console.error('Erreur chargement IA par page:', err);
        }
      }
    };

    fetchAiResults();
  }, [selectedSessionId, userData, facebookPagesSessions, aiResultsByPage]);

  // === RETURNS CONDITIONNELS (après tous les hooks) ===
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center">
            <AlertCircle className="mr-2" />
            Erreur
          </CardTitle>
        </CardHeader>
        <CardContent className="text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!userData) {
    return <div className="container mx-auto p-4">Aucune donnée disponible.</div>;
  }

  const filteredSessions = facebookPagesSessions.filter(session => {
    const lowerQuery = searchQuery.toLowerCase();

    // Filter by search query (ID, session URL, or any sub-session page name / URL)
    const matchesSearch = !searchQuery || (
      session.id.toLowerCase().includes(lowerQuery) ||
      session.url?.toLowerCase().includes(lowerQuery) ||
      (session.sub_sessions || []).some(sub =>
        sub.pageName?.toLowerCase().includes(lowerQuery) ||
        sub.url?.toLowerCase().includes(lowerQuery)
      )
    );
    
    // Filter by data type
    const matchesDataType = dataTypeFilter === 'all' || 
      (dataTypeFilter === 'page_info' && session.data_types?.includes('page_info')) ||
      (dataTypeFilter === 'posts' && session.data_types?.includes('posts')) ||
      (dataTypeFilter === 'both' && session.data_types?.includes('page_info') && session.data_types?.includes('posts'));
    
    return matchesSearch && matchesDataType;
  });

  const safeParseJson = (value: any) => {
    if (!value) return null;
    if (typeof value === 'object') return value;

    if (typeof value === 'string') {
      // Nettoyer les blocs de code Markdown type ```json ... ``` ou ``` ... ``` avant de parser
      const cleaned = value
        .trim()
        .replace(/^```json/i, '')
        .replace(/^```/, '')
        .replace(/```$/, '')
        .trim();

      try {
        return JSON.parse(cleaned);
      } catch {
        // Si le parse échoue encore, on renvoie au moins la chaîne nettoyée
        return cleaned;
      }
    }

    return value;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      'completed': { label: 'Terminé', className: 'bg-green-50 text-green-700 border-green-200' },
      'running': { label: 'En cours', className: 'bg-navy-50 text-navy-700 border-navy-200' },
      'failed': { label: 'Échoué', className: 'bg-red-50 text-red-700 border-red-200' },
    };
    const { label, className } = config[status] || config['completed'];
    return <Badge variant="outline" className={className}>{label}</Badge>;
  };

  const handleDownload = async (sessionId: string, fileType: 'info' | 'posts', pageName?: string) => {
    const fileName = `${pageName || 'facebook-page'}_${fileType}_${sessionId}.xlsx`;
    
    setDownloading(true);
    setDownloadProgress(0);
    setCurrentDownload(fileName);
    
    try {
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 200);

      const response = await api.get('/export/facebook-pages', {
        params: {
          sessionId,
          fileType,
          pageName
        },
        responseType: 'blob',
      });

      clearInterval(progressInterval);
      setDownloadProgress(100);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast({ 
        title: '✅ Téléchargement réussi', 
        description: `${fileName} a été téléchargé avec succès.` 
      });
    } catch (error: any) {
      console.error('Error downloading:', error);
      toast({ 
        title: '❌ Erreur', 
        description: error.response?.data?.message || 'Erreur lors du téléchargement', 
        variant: 'destructive' 
      });
    } finally {
      setTimeout(() => {
        setDownloading(false);
        setDownloadProgress(0);
        setCurrentDownload(null);
      }, 500);
    }
  };

  if (selectedSessionId) {
    const selectedSession = facebookPagesSessions.find(s => s.id === selectedSessionId);
    const hasPageInfo = selectedSession?.data_types?.includes('page_info');
    const hasPosts = selectedSession?.data_types?.includes('posts');
    const requestedInfo = selectedSession?.extraction_config?.extractInfo;
    const requestedPosts = selectedSession?.extraction_config?.extractPosts;

    const runAiAnalysisForSelectedPages = async () => {
      if (!selectedSession || selectedPageNames.length === 0) return;
      setAiLoading(true);
      try {
        for (const pageName of selectedPageNames) {
          try {
            const response = await api.post(`/sessions/facebook-pages/${selectedSession.id}/ai-analysis/page`, { pageName });
            setAiResultsByPage(prev => ({
              ...prev,
              [pageName]: response.data,
            }));
            setActiveAiPage(prev => prev || pageName);
          } catch (error: any) {
            console.error('AI per-page analysis error', error);
            toast({
              title: `Erreur IA pour la page ${pageName}`,
              description: error.response?.data?.message || "Une erreur est survenue pendant l'analyse IA de cette page.",
              variant: 'destructive',
            });
          }
        }

        if (selectedPageNames.length === 1) {
          toast({
            title: 'Analyse IA terminée',
            description: `Les recommandations pour la page ${selectedPageNames[0]} sont prêtes.`,
          });
        } else {
          toast({
            title: 'Analyses IA terminées',
            description: 'Les recommandations pour les pages sélectionnées sont prêtes.',
          });
        }
      } finally {
        setAiLoading(false);
      }
    };

    // Fonction pour retourner aux sessions et nettoyer l'état
    const handleBackToSessions = () => {
      setSelectedSessionId(null);
      lastUrlSessionParam.current = null;
      navigate('/dashboard/facebook-pages', { replace: true });
    };

    // Si la session n'est pas encore trouvée, afficher un état de chargement
    if (!selectedSession) {
      return (
        <div className="space-y-4">
          <Button
            variant="outline"
            onClick={handleBackToSessions}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux sessions
          </Button>
          <Card className="bg-white border border-cream-300 shadow-sm">
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-navy">Chargement de la session...</h3>
                  <p className="text-sm text-steel-200 mt-1">
                    Session ID: {selectedSessionId}
                  </p>
                  <p className="text-xs text-steel mt-2">
                    Si la session ne se charge pas, elle est peut-être encore en cours de traitement.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => fetchDashboardData()}
                  className="mt-4"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Rafraîchir
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div>
        <Button
          variant="outline"
          onClick={handleBackToSessions}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux sessions
        </Button>
        {selectedSession && (
          <div className="space-y-4">
            {/* Compact Info banner */}
            <Card className="bg-white border border-cream-300 shadow-sm">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-navy flex items-center gap-2">
                    <Facebook className="h-4 w-4 text-navy" />
                    Configuration de l'extraction
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`flex items-center gap-2 p-2 rounded-lg border-2 ${
                      requestedInfo 
                        ? (hasPageInfo ? 'border-green-500 bg-green-500/10' : 'border-yellow-500 bg-yellow-500/10')
                        : 'border-cream-300 bg-cream-100'
                    }`}>
                      <div className={`p-1.5 rounded ${
                        requestedInfo
                          ? (hasPageInfo ? 'bg-green-500/20' : 'bg-yellow-500/20')
                          : 'bg-cream-200'
                      }`}>
                        <Users className={`h-3.5 w-3.5 ${
                          requestedInfo
                            ? (hasPageInfo ? 'text-green-400' : 'text-yellow-400')
                            : 'text-steel'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-navy">Informations</p>
                        <p className="text-xs text-steel-200">
                          {requestedInfo ? (hasPageInfo ? '✓ Disponible' : '⚠ Indisponible') : '✗ Non demandé'}
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 p-2 rounded-lg border-2 ${
                      requestedPosts
                        ? (hasPosts ? 'border-navy bg-navy-500/10' : 'border-yellow-500 bg-yellow-500/10')
                        : 'border-cream-300 bg-cream-100'
                    }`}>
                      <div className={`p-1.5 rounded ${
                        requestedPosts
                          ? (hasPosts ? 'bg-navy-500/20' : 'bg-yellow-500/20')
                          : 'bg-cream-200'
                      }`}>
                        <MessageCircle className={`h-3.5 w-3.5 ${
                          requestedPosts
                            ? (hasPosts ? 'text-navy' : 'text-yellow-400')
                            : 'text-steel'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-navy">Posts</p>
                        <p className="text-xs text-steel-200">
                          {requestedPosts ? (hasPosts ? '✓ Disponible' : '⚠ Indisponible') : '✗ Non demandé'}
                        </p>
                      </div>
                    </div>
                  </div>
                  {selectedSession.sub_sessions && selectedSession.sub_sessions.length > 0 && (
                    <div className="pt-3 border-t border-cream-300">
                      <p className="text-xs font-medium text-steel mb-2">
                        {selectedSession.sub_sessions.length} page{selectedSession.sub_sessions.length > 1 ? 's' : ''} extraite{selectedSession.sub_sessions.length > 1 ? 's' : ''}
                      </p>
                      <div className="rounded-lg border border-dashed border-navy/20 bg-navy-500/5 px-2.5 py-2">
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                          {selectedSession.sub_sessions.map((subSession, idx) => (
                            <a
                              key={idx}
                              href={subSession.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-full bg-cream-100 px-2.5 py-1 text-[11px] text-navy border border-cream-300 shadow-sm hover:border-navy/50 hover:bg-navy-50 transition-colors max-w-full"
                            >
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-navy-500/20 text-[10px] font-semibold text-navy flex-shrink-0">
                                {idx + 1}
                              </span>
                              <Globe className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate max-w-[140px]">{subSession.pageName || subSession.url}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

          {/* Modal plein écran pour l'analyse IA complète */}
          {isAiModalOpen && activeAiPage && aiResultsByPage[activeAiPage] && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
              <div className="relative max-h-[90vh] w-full max-w-4xl rounded-xl bg-white shadow-2xl border border-cream-300 flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-cream-300 bg-cream-50 rounded-t-xl">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-navy" />
                      <h2 className="text-sm font-semibold text-navy">Analyse IA complète — {activeAiPage}</h2>
                    </div>
                    <p className="text-[11px] text-steel-200">
                      Modèle&nbsp;: {aiResultsByPage[activeAiPage].model} · Coût&nbsp;: {aiResultsByPage[activeAiPage].costCredits} crédit(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center rounded-full border border-navy/30 bg-cream-100 p-0.5 text-[11px] mr-2">
                      <button
                        type="button"
                        onClick={() => setAiViewMode('summary')}
                        className={`px-2 py-0.5 rounded-full transition-colors ${
                          aiViewMode === 'summary'
                            ? 'bg-navy text-white'
                            : 'text-navy hover:bg-navy-500/10'
                        }`}
                      >
                        Synthèse
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiViewMode('json')}
                        className={`px-2 py-0.5 rounded-full transition-colors ${
                          aiViewMode === 'json'
                            ? 'bg-navy text-white'
                            : 'text-navy hover:bg-navy-500/10'
                        }`}
                      >
                        JSON brut
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAiModalOpen(false)}
                      className="inline-flex items-center justify-center rounded-full border border-cream-300 bg-cream-100 p-1.5 text-steel hover:bg-cream-200 hover:text-navy transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto px-4 py-3 bg-white">
                  {(() => {
                    const parsed = safeParseJson(aiResultsByPage[activeAiPage].raw ?? aiResultsByPage[activeAiPage]) as any;

                    if (aiViewMode === 'json') {
                      return (
                        <pre className="text-[12px] leading-tight whitespace-pre-wrap break-words font-mono text-navy-700">
{JSON.stringify(parsed, null, 2)}
                        </pre>
                      );
                    }

                    const hasAuditLayout = parsed?.meta && parsed?.audit_summary && parsed?.quantitative_analysis;

                    if (hasAuditLayout) {
                      const meta = parsed.meta || {};
                      const audit = parsed.audit_summary || {};
                      const q = parsed.quantitative_analysis || {};
                      const averages = q.averages || {};
                      const topAuditPosts = Array.isArray(q.top_posts) ? q.top_posts : [];
                      const flopAuditPosts = Array.isArray(q.flop_posts) ? q.flop_posts : [];
                      const workingWell = Array.isArray(parsed.what_is_working_well) ? parsed.what_is_working_well : [];
                      const painPoints = Array.isArray(parsed.pain_points_and_fixes) ? parsed.pain_points_and_fixes : [];
                      const creativeIdeas = Array.isArray(parsed.creative_ideas_to_test) ? parsed.creative_ideas_to_test : [];
                      const finalVerdict = parsed.final_verdict || {};

                      return (
                        <div className="space-y-4 text-[12px] text-navy-700">
                          {/* Contexte analysé */}
                          <div className="bg-navy-50 border border-navy-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-[12px] text-navy-700">
                              <span className="font-semibold">Contexte analysé</span>
                              <span className="inline-flex items-center rounded-full bg-navy-500/10 px-2 py-0.5 text-[11px] text-navy border border-navy/20">
                                Page&nbsp;: {meta.page_analyzed || activeAiPage || '—'}
                              </span>
                              <span className="inline-flex items-center rounded-full bg-cream-200 px-2 py-0.5 text-[11px] text-navy-700 border border-cream-300">
                                Nombre de posts&nbsp;: {meta.posts_analyzed ?? meta.posts_count ?? '—'}
                              </span>
                            </div>
                            {meta.data_limitations && Array.isArray(meta.data_limitations) && meta.data_limitations.length > 0 && (
                              <p className="text-[11px] text-steel-200">
                                Limites des données&nbsp;: {meta.data_limitations.join('; ')}
                              </p>
                            )}
                          </div>

                          {/* Résumé global */}
                          <div className="bg-navy-500/10 border border-navy/20 rounded-lg p-3 space-y-2">
                            <p className="text-[11px] font-semibold text-navy-300">Résumé global</p>
                            <p className="text-[12px] text-navy-700">
                              {audit.global_health || 'Résumé non disponible.'}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-steel">
                              <span className="inline-flex items-center rounded-full bg-navy-100 px-2 py-0.5 border border-navy-300 text-navy-700">
                                Score d'engagement&nbsp;: {audit.engagement_score?.score ?? '—'} / 10
                              </span>
                              {audit.engagement_score?.calculation_method && (
                                <span className="text-[11px] text-steel-200">
                                  Méthode&nbsp;: {audit.engagement_score.calculation_method}
                                </span>
                              )}
                            </div>
                            {audit.key_insight && (
                              <p className="text-[11px] text-steel">
                                Insight clé&nbsp;: {audit.key_insight}
                              </p>
                            )}
                          </div>

                          {/* Métriques moyennes */}
                          <div className="bg-navy/10 border border-navy/20 rounded-lg p-3">
                            <p className="text-[11px] font-semibold text-navy-300 mb-2">Métriques moyennes</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                              <div className="bg-navy-50 rounded-md border border-navy-200 p-2">
                                <p className="text-[10px] text-steel-200 mb-0.5">Likes moyens</p>
                                <p className="text-[12px] font-semibold text-navy">{averages.likes ?? '—'}</p>
                              </div>
                              <div className="bg-navy-50 rounded-md border border-navy-200 p-2">
                                <p className="text-[10px] text-steel-200 mb-0.5">Commentaires moyens</p>
                                <p className="text-[12px] font-semibold text-navy">{averages.comments ?? '—'}</p>
                              </div>
                              <div className="bg-navy-50 rounded-md border border-navy-200 p-2">
                                <p className="text-[10px] text-steel-200 mb-0.5">Partages moyens</p>
                                <p className="text-[12px] font-semibold text-navy">{averages.shares ?? '—'}</p>
                              </div>
                              <div className="bg-navy-50 rounded-md border border-navy-200 p-2">
                                <p className="text-[10px] text-steel-200 mb-0.5">Engagement total moyen</p>
                                <p className="text-[12px] font-semibold text-navy">{averages.engagement_total ?? '—'}</p>
                              </div>
                            </div>
                          </div>

                          {/* Top & Flop posts audit */}
                          {(topAuditPosts.length > 0 || flopAuditPosts.length > 0) && (
                            <div className="grid gap-3 md:grid-cols-2">
                              {topAuditPosts.length > 0 && (
                                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                                  <p className="text-[11px] font-semibold text-green-300 mb-2">Top posts</p>
                                  <div className="space-y-2">
                                    {topAuditPosts.map((post: any, idx: number) => (
                                      <div key={idx} className="bg-green-50 rounded border border-green-200 p-2.5 space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 font-semibold">#{post.rank ?? idx + 1}</span>
                                          <span className="text-[10px] text-steel">{post.format || '—'}</span>
                                        </div>
                                        <p className="text-[11px] text-cream-400 font-medium line-clamp-3">{post.text_preview || post.texte || post.text}</p>
                                        <p className="text-[10px] text-steel-200">
                                          👍 {post.metrics?.likes ?? '—'} · 💬 {post.metrics?.comments ?? '—'} · 🔁 {post.metrics?.shares ?? '—'}
                                        </p>
                                        {post.engagement_vs_average && (
                                          <p className="text-[10px] text-steel-200">{post.engagement_vs_average}</p>
                                        )}
                                        {Array.isArray(post.success_factors) && post.success_factors.length > 0 && (
                                          <p className="text-[10px] text-cream-400">
                                            Facteurs de succès&nbsp;: {post.success_factors.join(', ')}
                                          </p>
                                        )}
                                        {post.explanation && (
                                          <p className="text-[10px] text-cream-400">Pourquoi ça marche&nbsp;: {post.explanation}</p>
                                        )}
                                        {post.elements_replicables && (
                                          <p className="text-[10px] text-green-400 italic">À reproduire&nbsp;: {post.elements_replicables}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {flopAuditPosts.length > 0 && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                  <p className="text-[11px] font-semibold text-red-300 mb-2">Flops</p>
                                  <div className="space-y-2">
                                    {flopAuditPosts.map((post: any, idx: number) => (
                                      <div key={idx} className="bg-red-50 rounded border border-red-200 p-2.5 space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-semibold">#{post.rank ?? idx + 1}</span>
                                          <span className="text-[10px] text-steel">{post.format || '—'}</span>
                                        </div>
                                        <p className="text-[11px] text-cream-400 font-medium line-clamp-3">{post.text_preview || post.texte || post.text}</p>
                                        <p className="text-[10px] text-steel-200">
                                          👍 {post.metrics?.likes ?? '—'} · 💬 {post.metrics?.comments ?? '—'} · 🔁 {post.metrics?.shares ?? '—'}
                                        </p>
                                        {post.engagement_vs_average && (
                                          <p className="text-[10px] text-steel-200">{post.engagement_vs_average}</p>
                                        )}
                                        {Array.isArray(post.failure_factors) && post.failure_factors.length > 0 && (
                                          <p className="text-[10px] text-cream-400">
                                            Facteurs d'échec&nbsp;: {post.failure_factors.join(', ')}
                                          </p>
                                        )}
                                        {post.explanation && (
                                          <p className="text-[10px] text-cream-400">Pourquoi ça ne marche pas&nbsp;: {post.explanation}</p>
                                        )}
                                        {post.improvement_recommendation && (
                                          <p className="text-[10px] text-cream-400">Comment améliorer&nbsp;: {post.improvement_recommendation}</p>
                                        )}
                                        {post.why_it_works && (
                                          <p className="text-[10px] text-green-400 italic">Version améliorée&nbsp;: {post.improved_version}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Ce qui fonctionne bien */}
                          {workingWell.length > 0 && (
                            <div className="bg-green-50/70 border border-green-100 rounded-lg p-3 space-y-1">
                              <p className="text-[11px] font-semibold text-green-800">Ce qui fonctionne bien</p>
                              <div className="space-y-1.5">
                                {workingWell.map((item: any, idx: number) => (
                                  <div key={idx} className="bg-white/90 rounded border border-green-100 p-2">
                                    <p className="text-[12px] font-semibold text-navy">{item.strength}</p>
                                    {item.data_proof && (
                                      <p className="text-[11px] text-navy-700">Données&nbsp;: {item.data_proof}</p>
                                    )}
                                    {item.recommendation && (
                                      <p className="text-[11px] text-navy-700">Recommandation&nbsp;: {item.recommendation}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Points de friction & correctifs */}
                          {painPoints.length > 0 && (
                            <div className="bg-gold-50/80 border border-gold-100 rounded-lg p-3 space-y-1">
                              <p className="text-[11px] font-semibold text-gold-800">Points de friction & correctifs</p>
                              <div className="space-y-1.5">
                                {painPoints.map((pp: any, idx: number) => (
                                  <div key={idx} className="bg-white/90 rounded border border-gold-100 p-2">
                                    <p className="text-[12px] font-semibold text-navy">{pp.problem}</p>
                                    <p className="text-[10px] text-steel mb-0.5">Sévérité&nbsp;: {pp.severity || '—'}</p>
                                    {pp.data_evidence && (
                                      <p className="text-[11px] text-navy-700">Données&nbsp;: {pp.data_evidence}</p>
                                    )}
                                    {pp.root_cause && (
                                      <p className="text-[11px] text-navy-700">Cause racine&nbsp;: {pp.root_cause}</p>
                                    )}
                                    {pp.quick_fix && (
                                      <p className="text-[11px] text-navy-700">
                                        Action rapide&nbsp;: {pp.quick_fix.action} (Effort&nbsp;: {pp.quick_fix.effort || '—'})
                                      </p>
                                    )}
                                    {pp.quick_fix?.example && (
                                      <p className="text-[11px] text-navy-700">Exemple&nbsp;: {pp.quick_fix.example}</p>
                                    )}
                                    {pp.expected_impact && (
                                      <p className="text-[11px] text-navy-700">Impact attendu&nbsp;: {pp.expected_impact}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Idées créatives à tester */}
                          {creativeIdeas.length > 0 && (
                            <div className="bg-navy-50/80 border border-navy-100 rounded-lg p-3 space-y-1">
                              <p className="text-[11px] font-semibold text-navy">Idées créatives à tester</p>
                              <div className="space-y-1.5">
                                {creativeIdeas.map((idea: any, idx: number) => (
                                  <div key={idx} className="bg-white/90 rounded border border-navy-100 p-2">
                                    <p className="text-[12px] font-semibold text-navy">{idea.idea_name}</p>
                                    {idea.description && (
                                      <p className="text-[11px] text-navy-700">Description&nbsp;: {idea.description}</p>
                                    )}
                                    {idea.why_it_should_work && (
                                      <p className="text-[11px] text-navy-700">Pourquoi ça devrait marcher&nbsp;: {idea.why_it_should_work}</p>
                                    )}
                                    {idea.implementation && (
                                      <p className="text-[11px] text-navy-700">
                                        Implémentation&nbsp;: Format {idea.implementation.format || '—'}, Fréquence {idea.implementation.frequency || '—'}
                                      </p>
                                    )}
                                    {idea.implementation?.example_post && (
                                      <p className="text-[11px] text-navy-700">Exemple de post&nbsp;: {idea.implementation.example_post}</p>
                                    )}
                                    {idea.expected_benefit && (
                                      <p className="text-[11px] text-navy-700">Bénéfice attendu&nbsp;: {idea.expected_benefit}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Verdict final */}
                          {(finalVerdict.one_thing_to_stop || finalVerdict.one_thing_to_start || finalVerdict.one_thing_to_amplify) && (
                            <div className="bg-navy text-cream-50 rounded-lg p-3 grid gap-2 md:grid-cols-3 text-[11px]">
                              <div>
                                <p className="font-semibold text-navy mb-1">À arrêter</p>
                                <p className="text-cream-400">{finalVerdict.one_thing_to_stop || '—'}</p>
                              </div>
                              <div>
                                <p className="font-semibold text-navy mb-1">À commencer</p>
                                <p className="text-cream-400">{finalVerdict.one_thing_to_start || '—'}</p>
                              </div>
                              <div>
                                <p className="font-semibold text-navy mb-1">À amplifier</p>
                                <p className="text-cream-400">{finalVerdict.one_thing_to_amplify || '—'}</p>
                              </div>
                            </div>
                          )}

                          {/* Disclaimer IA */}
                          {(parsed?.disclaimer || parsed?.ai_disclaimer) && (
                            <div className="bg-cream-100 border border-cream-300 rounded-lg p-3 text-[11px] space-y-1">
                              <p className="font-semibold text-navy">Disclaimer IA</p>
                              <p className="text-navy-700">{parsed.disclaimer || parsed.ai_disclaimer}</p>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Fallback : ancien schéma sector / top_posts / flop_posts / recommandations

                    // Mapping flexible pour supporter les schémas FR et EN plus simples
                    const sector = parsed?.secteur || parsed?.sector || 'Secteur non détecté.';
                    const language = parsed?.langue_principale || parsed?.language || '—';
                    const country = parsed?.pays || parsed?.country || '—';

                    const engagementStats = parsed?.engagement_stats;
                    const engagementMetrics = parsed?.engagementMetrics;
                    const engagementAverage =
                      engagementStats?.moyenne_engagement ??
                      engagementMetrics?.averageEngagement ??
                      '—';
                    const engagementStd =
                      engagementStats?.ecart_type ??
                      engagementMetrics?.stdDevEngagement ??
                      '—';

                    const topPosts = Array.isArray(parsed?.top_posts)
                      ? parsed.top_posts
                      : Array.isArray(parsed?.top_5)
                        ? parsed.top_5
                        : Array.isArray(parsed?.topPosts)
                          ? parsed.topPosts
                          : [];

                    const flopPosts = Array.isArray(parsed?.flop_posts)
                      ? parsed.flop_posts
                      : Array.isArray(parsed?.flop_5)
                        ? parsed.flop_5
                        : Array.isArray(parsed?.flopPosts)
                          ? parsed.flopPosts
                          : [];

                    const recommendations = Array.isArray(parsed?.recommandations)
                      ? parsed.recommandations
                      : Array.isArray(parsed?.recommendations)
                        ? parsed.recommendations
                        : [];

                    return (
                      <div className="space-y-4 text-[12px] text-navy">
                        {/* Résumé global */}
                        <div className="grid gap-3 md:grid-cols-[2fr,1fr]">
                          <div className="bg-steel-50 border border-steel-100 rounded-lg p-3 space-y-1">
                            <p className="text-[11px] font-semibold text-steel-800">Résumé global</p>
                            <p className="text-[12px] font-medium text-navy">
                              {sector}
                            </p>
                            <p className="text-[12px] text-navy-700">
                              Langue&nbsp;: {language} · Pays&nbsp;: {country}
                            </p>
                          </div>
                          <div className="bg-white border border-steel-100 rounded-lg p-3 flex flex-col justify-center">
                            <p className="text-[11px] font-semibold text-steel-800 mb-1">Engagement</p>
                            <p className="text-[11px] text-navy-700">
                              Moyenne&nbsp;: {engagementAverage} · Écart-type&nbsp;: {engagementStd}
                            </p>
                          </div>
                        </div>

                        {/* TOP posts */}
                        {topPosts.length > 0 && (
                          <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                            <p className="text-[11px] font-semibold text-green-800 mb-2">TOP posts (performants)</p>
                            <div className="space-y-2">
                              {topPosts.map((post: any, idx: number) => {
                                const metrics = post.metrics || {
                                  likes: post.likes,
                                  comments: post.comments,
                                  shares: post.shares,
                                  score: post.score ?? post.engagementScore ?? post.engagement_score,
                                };
                                const percentAbove = post.pourcentage_vs_moyenne || post.percentAboveAverage;
                                const successFactors = post.facteurs_de_succes || post.successFactors;
                                const improvedVersion = post.version_amelioree || post.improvedVersion;
                                const text = post.texte || post.text || post.text_preview;

                                return (
                                  <div key={idx} className="bg-white/90 rounded border border-green-100 p-2.5 space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-800 font-semibold">#{idx + 1}</span>
                                      <span className="text-[10px] text-steel">{post.format || '—'}</span>
                                    </div>
                                    <p className="text-[11px] text-navy font-medium line-clamp-3">{text}</p>
                                    <p className="text-[10px] text-steel">
                                      Likes&nbsp;: {metrics?.likes ?? '—'} · Com&nbsp;: {metrics?.comments ?? '—'} · Partages&nbsp;: {metrics?.shares ?? '—'} · Score&nbsp;: {metrics?.score ?? '—'}
                                    </p>
                                    {percentAbove && (
                                      <p className="text-[10px] text-steel">vs moyenne&nbsp;: {percentAbove}</p>
                                    )}
                                    {Array.isArray(successFactors) && successFactors.length > 0 && (
                                      <p className="text-[10px] text-navy-700">
                                        Facteurs de succès&nbsp;: {successFactors.join(', ')}
                                      </p>
                                    )}
                                    {post.explication || post.explanation ? (
                                      <p className="text-[10px] text-navy-700">Pourquoi ça marche&nbsp;: {post.explication || post.explanation}</p>
                                    ) : null}
                                    {improvedVersion && (
                                      <p className="text-[10px] text-navy-700 italic">Version améliorée suggérée&nbsp;: {improvedVersion}</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* FLOP posts */}
                        {flopPosts.length > 0 && (
                          <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                            <p className="text-[11px] font-semibold text-red-800 mb-2">FLOP posts (à corriger)</p>
                            <div className="space-y-2">
                              {flopPosts.map((post: any, idx: number) => {
                                const metrics = post.metrics || {
                                  likes: post.likes,
                                  comments: post.comments,
                                  shares: post.shares,
                                  score: post.score ?? post.engagementScore ?? post.engagement_score,
                                };
                                const percentBelow = post.pourcentage_vs_moyenne || post.percentBelowAverage;
                                const failureFactors = post.facteurs_d_echec || post.failureFactors;
                                const improvementRecommendation = post.comment_l_ameliorer || post.improvementRecommendation;
                                const improvedVersion = post.version_amelioree || post.improvedVersion;
                                const text = post.texte || post.text || post.text_preview;

                                return (
                                  <div key={idx} className="bg-white/90 rounded border border-red-100 p-2.5 space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-800 font-semibold">#{idx + 1}</span>
                                      <span className="text-[10px] text-steel">{post.format || '—'}</span>
                                    </div>
                                    <p className="text-[11px] text-navy font-medium line-clamp-3">{text}</p>
                                    <p className="text-[10px] text-steel">
                                      Likes&nbsp;: {metrics?.likes ?? '—'} · Com&nbsp;: {metrics?.comments ?? '—'} · Partages&nbsp;: {metrics?.shares ?? '—'} · Score&nbsp;: {metrics?.score ?? '—'}
                                    </p>
                                    {percentBelow && (
                                      <p className="text-[10px] text-steel">vs moyenne&nbsp;: {percentBelow}</p>
                                    )}
                                    {Array.isArray(failureFactors) && failureFactors.length > 0 && (
                                      <p className="text-[10px] text-navy-700">
                                        Facteurs d'échec&nbsp;: {failureFactors.join(', ')}
                                      </p>
                                    )}
                                    {post.explication || post.explanation ? (
                                      <p className="text-[10px] text-navy-700">Pourquoi ça ne performe pas&nbsp;: {post.explication || post.explanation}</p>
                                    ) : null}
                                    {improvementRecommendation && (
                                      <p className="text-[10px] text-navy-700">Comment améliorer&nbsp;: {improvementRecommendation}</p>
                                    )}
                                    {improvedVersion && (
                                      <p className="text-[10px] text-navy-700 italic">Version améliorée suggérée&nbsp;: {improvedVersion}</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Recommandations prioritaires */}
                        {recommendations.length > 0 && (
                          <div className="bg-gold-50 border border-gold-100 rounded-lg p-3">
                            <p className="text-[11px] font-semibold text-gold-800 mb-2">Recommandations actionnables</p>
                            <div className="grid gap-2 md:grid-cols-2">
                              {recommendations.map((rec: any, idx: number) => {
                                const priority = rec.priorité || rec.priorite || rec.priority;
                                const proof = rec.preuve || rec.proof;
                                const example = rec.exemple || rec.example;

                                return (
                                  <div key={idx} className="bg-white/90 rounded border border-gold-100 p-2.5 space-y-0.5">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-[12px] font-semibold text-navy truncate">{rec.action}</p>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                                        priority === 'CRITIQUE'
                                          ? 'bg-red-50 text-red-700 border-red-200'
                                          : priority === 'HAUTE'
                                            ? 'bg-gold-50 text-gold-700 border-gold-200'
                                            : priority === 'MOYENNE'
                                              ? 'bg-navy-50 text-navy-700 border-navy-200'
                                              : 'bg-cream-50 text-navy-700 border-cream-300'
                                      }`}>
                                        {priority || 'N/A'}
                                      </span>
                                    </div>
                                    {proof && (
                                      <p className="text-[11px] text-navy-700">Preuve&nbsp;: {proof}</p>
                                    )}
                                    {example && (
                                      <p className="text-[11px] text-navy-700">Exemple&nbsp;: {example}</p>
                                    )}
                                    <p className="text-[11px] text-navy-700">
                                      Effort&nbsp;: {rec.effort || '—'} · Impact estimé&nbsp;: {rec.impact || '—'}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Disclaimer IA */}
                        {(parsed?.disclaimer || parsed?.ai_disclaimer) && (
                          <div className="bg-cream-100 border border-cream-300 rounded-lg p-3 text-[11px] space-y-1">
                            <p className="font-semibold text-navy">Disclaimer IA</p>
                            <p className="text-navy-700">{parsed.disclaimer || parsed.ai_disclaimer}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
                </div>
              </CardContent>
            </Card>

            {/* Compact Dashboard */}
            {selectedSession.sub_sessions && selectedSession.sub_sessions.length > 0 && (
              <Card className="bg-white border border-cream-300 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-navy flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-steel-600" />
                        Tableau de bord
                      </CardTitle>
                      <p className="text-xs text-steel mt-0.5">
                        Vue d'ensemble des données
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Download All Button */}
                      <Button
                        onClick={async () => {
                          setDownloading(true);
                          setDownloadProgress(0);
                          setCurrentDownload('all_data');
                          
                          try {
                            const progressInterval = setInterval(() => {
                              setDownloadProgress(prev => prev >= 90 ? prev : prev + 10);
                            }, 200);

                            const response = await api.get('/export/facebook-pages/complete', {
                              params: { 
                                sessionId: selectedSession.id
                              },
                              responseType: 'blob',
                            });

                            clearInterval(progressInterval);
                            setDownloadProgress(100);

                            const url = window.URL.createObjectURL(new Blob([response.data]));
                            const link = document.createElement('a');
                            link.href = url;
                            link.setAttribute('download', `facebook_pages_complete_${selectedSession.id}.xlsx`);
                            document.body.appendChild(link);
                            link.click();
                            link.remove();

                            toast({ 
                              title: '✅ Téléchargement réussi', 
                              description: 'Fichier Excel complet téléchargé avec succès.' 
                            });
                          } catch (error: any) {
                            toast({ 
                              title: '❌ Erreur', 
                              description: 'Erreur lors du téléchargement', 
                              variant: 'destructive' 
                            });
                          } finally {
                            setTimeout(() => {
                              setDownloading(false);
                              setDownloadProgress(0);
                              setCurrentDownload(null);
                            }, 500);
                          }
                        }}
                        disabled={downloading}
                        size="sm"
                        className="bg-gradient-to-r from-steel-600 to-navy hover:from-steel-700 hover:to-navy-700 text-white shadow-sm"
                      >
                        {downloading && currentDownload === 'all_data' ? (
                          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                        )}
                        <span className="text-sm">Télécharger tout</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Compact Stats Row */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <div className="flex items-center gap-2 p-2 bg-steel-50 rounded-lg border border-steel-200">
                      <div className="p-1.5 bg-steel-100 rounded">
                        <Facebook className="h-3.5 w-3.5 text-steel-600" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-steel-900">{fbSummary ? fbSummary.pages : selectedSession.sub_sessions.length}</div>
                        <div className="text-xs text-steel-700">Pages</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-200">
                      <div className="p-1.5 bg-red-100 rounded">
                        <Heart className="h-3.5 w-3.5 text-red-600" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-red-900">
                          {fbSummary?.totalLikes?.toLocaleString() || '0'}
                        </div>
                        <div className="text-xs text-red-700">J'aime</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-navy-50 rounded-lg border border-navy-200">
                      <div className="p-1.5 bg-navy-100 rounded">
                        <MessageCircle className="h-3.5 w-3.5 text-navy" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-navy">
                          {fbSummary ? fbSummary.totalPosts : 0}
                        </div>
                        <div className="text-xs text-navy-700">Posts</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-navy-50 rounded-lg border border-navy-200">
                      <div className="p-1.5 bg-navy-100 rounded">
                        <Users className="h-3.5 w-3.5 text-navy-600" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-navy">
                          {fbSummary?.totalFollowers?.toLocaleString() || '0'}
                        </div>
                        <div className="text-xs text-navy-700">Abonnés</div>
                      </div>
                    </div>
                  </div>

                  {/* Bouton de redirection vers Analyses IA */}
                  <div className="mb-4">
                    <Card className="bg-gradient-to-r from-gold-50 to-gold-50 border-gold-200">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gold-100 rounded-lg">
                              <BarChart3 className="h-5 w-5 text-gold-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-navy">Analyse IA disponible</h3>
                              <p className="text-sm text-steel">
                                Obtenez des recommandations personnalisées pour vos pages Facebook
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={() => navigate('/dashboard/ai-analyses')}
                            className="bg-gradient-to-r from-gold to-gold hover:from-gold-600 hover:to-gold-600 text-white"
                          >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Accéder aux Analyses IA
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Table View for Details */}
                  <div>
                    <h3 className="text-sm font-semibold text-navy mb-2 flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-steel-600" />
                      Détail par page
                    </h3>
                    <div className="border border-cream-300 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto max-h-64">
                        <table className="w-full text-sm">
                          <thead className="bg-cream-50 border-b border-cream-300 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-navy-700">#</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-navy-700">Page</th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-navy-700">J'aime</th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-navy-700">Abonnés</th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-navy-700">Posts</th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-navy-700">Suivis</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-cream-200">
                            {(fbSummary?.pagesDetails || []).map((page, idx) => (
                                <tr key={idx} className="hover:bg-steel-50 transition-colors">
                                  <td className="px-3 py-2">
                                    <Badge className="bg-steel-600 text-white text-xs px-1.5 py-0.5">#{idx + 1}</Badge>
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="font-medium text-navy truncate max-w-xs">{page.pageName}</div>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <Heart className="h-3 w-3 text-red-500" />
                                      <span className="font-semibold text-navy">{(page.likes || 0).toLocaleString()}</span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <Users className="h-3 w-3 text-steel-500" />
                                      <span className="font-semibold text-navy">{(page.followers || 0).toLocaleString()}</span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <MessageCircle className="h-3 w-3 text-navy" />
                                      <span className="font-semibold text-navy">{page.posts}</span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <TrendingUp className="h-3 w-3 text-green-500" />
                                      <span className="font-semibold text-navy">0</span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Show page info and posts for ALL pages (up to 20) */}
            {selectedSession.sub_sessions && selectedSession.sub_sessions.length > 0 && (
              <div className="space-y-6">
                {selectedSession.sub_sessions.map((subSession, idx) => {
                  const hasSubPageInfo = !!(subSession.infoStatus === 'SUCCEEDED' && subSession.infoDatasetId);
                  const hasSubPosts = !!(subSession.postsStatus === 'SUCCEEDED' && subSession.postsDatasetId);
                  
                  return (
                    <div key={idx} className="space-y-4">
                      {/* Page Header with index */}
                      <div className="bg-gradient-to-r from-navy-50 to-steel-50 p-4 rounded-lg border-2 border-navy-200 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-navy text-white text-xs px-2 py-0.5">
                                #{idx + 1}
                              </Badge>
                              <h3 className="font-bold text-lg text-navy truncate">
                                {subSession.pageName}
                              </h3>
                            </div>
                            <a 
                              href={subSession.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-navy hover:text-navy hover:underline flex items-center gap-1 mt-1"
                            >
                              <Globe className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{subSession.url}</span>
                            </a>
                          </div>
                          <Facebook className="h-6 w-6 text-navy flex-shrink-0" />
                        </div>
                      </div>
                      
                      {/* Show page info view (with optional posts collapse) if available for this page */}
                      {hasSubPageInfo && (
                        <FacebookPageItemsView 
                          sessionId={selectedSession.id}
                          pageName={subSession.pageName}
                          hasPostsAvailable={hasSubPosts}
                        />
                      )}
                      
                      {/* Show message if no data for this specific page */}
                      {!hasSubPageInfo && !hasSubPosts && (
                        <Card className="bg-yellow-50 border-yellow-200">
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-2 text-yellow-800">
                              <AlertTriangle className="h-5 w-5" />
                              <p className="text-sm font-medium">
                                Aucune donnée disponible pour cette page
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-14 md:pt-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Facebook className="h-6 w-6 sm:h-8 sm:w-8" />
          Fichiers Facebook Pages
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Gérez vos extractions Facebook Pages
        </p>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{facebookPagesSessions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Extractions disponibles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pages Extraites</CardTitle>
            <Facebook className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {facebookPagesSessions.reduce((sum, s) => sum + (s.sub_sessions?.length || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pages Facebook</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En Cours</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {facebookPagesSessions.filter(s => s.status === 'running').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Sessions actives</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 border-b border-cream-200">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>Rechercher et filtrer</span>
            <span className="text-[11px] text-muted-foreground">Affinage local, sans rechargement</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par ID, URL ou nom de page..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
          <div>
            <p className="text-xs font-medium mb-1 text-muted-foreground uppercase tracking-wide">Type de données</p>
            <div className="flex flex-wrap gap-1.5">
              <Button
                variant={dataTypeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDataTypeFilter('all')}
                className={`h-7 px-3 text-xs rounded-full ${dataTypeFilter === 'all' ? 'bg-slate-900 text-white hover:bg-slate-900' : ''}`}
              >
                Toutes
              </Button>
              <Button
                variant={dataTypeFilter === 'page_info' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDataTypeFilter('page_info')}
                className={`h-7 px-3 text-xs rounded-full flex items-center ${
                  dataTypeFilter === 'page_info'
                    ? 'bg-steel-600 text-white hover:bg-steel-700 border-transparent'
                    : 'border-steel-200 text-steel-700 hover:bg-steel-50'
                }`}
              >
                <Users className="h-3 w-3 mr-1" />
                Infos
              </Button>
              <Button
                variant={dataTypeFilter === 'posts' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDataTypeFilter('posts')}
                className={`h-7 px-3 text-xs rounded-full flex items-center ${
                  dataTypeFilter === 'posts'
                    ? 'bg-gold text-white hover:bg-gold-600 border-transparent'
                    : 'border-gold-200 text-gold-700 hover:bg-gold-50'
                }`}
              >
                <MessageCircle className="h-3 w-3 mr-1" />
                Posts
              </Button>
              <Button
                variant={dataTypeFilter === 'both' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDataTypeFilter('both')}
                className={`h-7 px-3 text-xs rounded-full flex items-center ${
                  dataTypeFilter === 'both'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 border-transparent'
                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <Heart className="h-3 w-3 mr-1" />
                Les deux
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Download Progress */}
      {downloading && (
        <Card className="bg-navy-50 border-navy-200">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-steel font-medium">Téléchargement en cours...</span>
                <span className="text-navy font-semibold">{downloadProgress}%</span>
              </div>
              <Progress value={downloadProgress} className="h-2" />
              {currentDownload && (
                <p className="text-xs text-steel truncate">{currentDownload}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Sessions Facebook Pages</span>
            <Badge variant="secondary">
              {filteredSessions.length} session{filteredSessions.length > 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Facebook className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune session trouvée</p>
              <p className="text-sm mt-2">
                {searchQuery 
                  ? 'Essayez de modifier votre recherche' 
                  : 'Lancez votre première extraction Facebook Pages'}
              </p>
            </div>
          ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredSessions.map((session) => (
              <div
              key={session.id}
              className="border rounded-lg hover:border-navy-200 hover:shadow-sm transition-all bg-white"
        >
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-navy-50 rounded-full flex-shrink-0">
                        <Facebook className="h-6 w-6 text-navy" />
                      </div>
                      <div className="flex-1 min-w-0">
{/* Header with status */}
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(session.status)}
                        {session.sub_sessions && session.sub_sessions.length > 0 && (
                        <Badge variant="outline" className="text-[11px]">
                         {session.sub_sessions.length} page{session.sub_sessions.length > 1 ? 's' : ''}
                        </Badge>
                        )}
                        </div>
                      </div>

                        {/* Compact summary strip */}
                        <div className="mb-3 rounded-md bg-slate-50 px-3 py-1.5 text-[11px] text-slate-700 flex flex-wrap items-center gap-x-3 gap-y-1">
                          {session.sub_sessions && session.sub_sessions.length > 0 && (
                            <span className="font-medium">
                              {session.sub_sessions.length} page{session.sub_sessions.length > 1 ? 's' : ''} scrappée{session.sub_sessions.length > 1 ? 's' : ''}
                            </span>
                          )}
                          <span className="h-3 w-px bg-slate-300" />
                          <span>
                            Infos&nbsp;:
                            {session.data_types?.includes('page_info') ? (
                              <span className="text-emerald-600 font-semibold"> ✓ disponibles</span>
                            ) : (
                              <span className="text-slate-400"> —</span>
                            )}
                          </span>
                          <span className="h-3 w-px bg-slate-300" />
                          <span>
                            Posts&nbsp;:
                            {session.data_types?.includes('posts') ? (
                              <span className="text-emerald-600 font-semibold"> ✓ disponibles</span>
                            ) : (
                              <span className="text-slate-400"> —</span>
                            )}
                          </span>
                        </div>

                        {/* Pages principales */}
                        {session.sub_sessions && session.sub_sessions.length > 0 && (
                          <div className="mb-3">
                            <p className="text-[11px] font-medium text-slate-600 uppercase tracking-wide mb-1">
                              Pages principales
                            </p>
                            <div className="flex flex-wrap gap-1.5 max-w-full">
                              {session.sub_sessions.map((subSession, idx) => (
                                <div
                                  key={idx}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 border border-slate-200 text-[11px] max-w-full"
                                >
                                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-slate-600 border border-slate-200">
                                    {idx + 1}
                                  </span>
                                  <span className="truncate max-w-[120px]">
                                    {subSession.pageName || 'Page Facebook'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Meta info */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(session.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                          </div>
                          <div className="font-mono">
                            ID: {session.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="mt-4 pt-4 border-t flex flex-wrap items-center justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSessionId(session.id)}
                        className="min-w-[220px] justify-center"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Voir les détails & Télécharger les données
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FacebookPagesFilesPage;
