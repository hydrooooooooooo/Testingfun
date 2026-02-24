import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageSquare,
  ThumbsUp,
  HelpCircle,
  AlertTriangle,
  CheckCircle,
  Bell,
  Loader2,
  Key,
  Plus,
  X,
  Search,
  Facebook,
  Calendar,
  Zap,
  FileText,
  Play,
  Info,
  ChevronRight,
  Settings,
  Download,
  Filter,
} from 'lucide-react';
import api from '@/services/api';
import { useUnreadAlerts } from '@/hooks/useUnreadAlerts';
import { formatDistanceToNow, format, subDays, subWeeks, subMonths, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import AddKeywordModal from '@/components/AddKeywordModal';

interface Mention {
  id: number;
  mention_type: 'recommendation' | 'question' | 'complaint';
  priority_level: 'low' | 'medium' | 'high' | 'urgent';
  status: 'new' | 'in_progress' | 'resolved' | 'ignored';
  comment_text: string;
  comment_author: string;
  comment_likes: number;
  comment_posted_at: string;
  post_url: string;
  brand_keywords: string[] | string;
  sentiment_score: number;
  suggested_response_time: number;
  created_at: string;
  page_name?: string;
  post_type?: string;
  session_id?: string;
}

interface Stats {
  total: number;
  new: number;
  recommendations: number;
  questions: number;
  complaints: number;
  avgSentiment: number;
}

interface KeywordDetailed {
  id: number;
  keyword: string;
  category: string;
  monitoredPages: string[];
  frequency: string;
  emailAlerts: boolean;
  mentionsCount: number;
  lastMentionAt: string | null;
  createdAt: string;
  linkedAutomationId?: string;
}

interface FacebookPage {
  pageName: string;
  url: string;
  followers: number;
  postsCount: number;
  hasComments: boolean;
}

interface FacebookSession {
  sessionId: string;
  createdAt: string;
  pages: FacebookPage[];
  totalPages: number;
}

const MentionsPage: React.FC = () => {
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const navigate = useNavigate();
  const { markAllAsRead } = useUnreadAlerts();
  const [keywords, setKeywords] = useState<KeywordDetailed[]>([]);
  const [sessions, setSessions] = useState<FacebookSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingKeywords, setLoadingKeywords] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [analyzingSession, setAnalyzingSession] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'mentions' | 'analyze'>('mentions');
  const [showAddKeywordModal, setShowAddKeywordModal] = useState(false);
  
  // États pour recherche et filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchMentions();
    fetchStats();
    fetchKeywords();
    fetchSessions();
    markAllAsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMentions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/mentions');
      setMentions(response.data.mentions || []);
    } catch (error: unknown) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur lors du chargement des mentions';
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/mentions/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchKeywords = async () => {
    try {
      setLoadingKeywords(true);
      const response = await api.get('/mentions/keywords/detailed');
      setKeywords(response.data.keywords || []);
    } catch (error) {
      console.error('Error fetching keywords:', error);
    } finally {
      setLoadingKeywords(false);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      const response = await api.get('/mentions/facebook-pages-sessions');
      setSessions(response.data.sessions || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleAnalyzeSession = async (sessionId: string) => {
    if (keywords.length === 0) {
      toast({
        title: 'Aucun mot-clé configuré',
        description: 'Ajoutez au moins un mot-clé avant de lancer une analyse',
        variant: 'destructive',
      });
      return;
    }

    try {
      setAnalyzingSession(sessionId);
      const response = await api.post(`/mentions/sessions/${sessionId}/analyze`);
      
      toast({
        title: 'Analyse terminée',
        description: `${response.data.mentionsFound} mention(s) détectée(s)${response.data.urgentMentions > 0 ? ` dont ${response.data.urgentMentions} urgente(s)` : ''}`,
      });

      // Rafraîchir les données
      fetchMentions();
      fetchStats();
      setActiveTab('mentions');
    } catch (error: unknown) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur lors de l\'analyse';
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setAnalyzingSession(null);
    }
  };

  const formatSessionDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "d MMM yyyy 'à' HH:mm", { locale: fr });
    } catch {
      return 'Date inconnue';
    }
  };

  const handleDeleteKeyword = async (keywordId: number) => {
    try {
      await api.delete(`/mentions/keywords/${keywordId}`);
      toast({
        title: 'Succès',
        description: 'Mot-clé supprimé',
      });
      fetchKeywords();
    } catch (error: unknown) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur lors de la suppression';
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const formatLastMention = (date: string | null) => {
    if (!date) return null;
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: false, locale: fr });
    } catch {
      return null;
    }
  };

  const handleResolve = async (mentionId: number) => {
    try {
      await api.post(`/mentions/${mentionId}/resolve`);
      toast({
        title: 'Succès',
        description: 'Mention marquée comme traitée',
      });
      fetchMentions();
      fetchStats();
    } catch (error: unknown) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur lors de la résolution';
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const getMentionIcon = (type: string) => {
    switch (type) {
      case 'recommendation':
        return <ThumbsUp className="w-4 h-4 text-green-600" />;
      case 'question':
        return <HelpCircle className="w-4 h-4 text-navy" />;
      case 'complaint':
        return <AlertTriangle className="w-4 h-4 text-gold-600" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-gold-100 text-gold-800 border-gold-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'recommendation':
        return 'Recommandation';
      case 'question':
        return 'Question';
      case 'complaint':
        return 'Plainte';
      default:
        return type;
    }
  };

  const hasKeywords = keywords.length > 0;
  const hasSessions = sessions.length > 0;
  const cronKeywords = keywords.filter(k => k.frequency === 'cron');
  const manualKeywords = keywords.filter(k => k.frequency !== 'cron');

  // Filtrer les mentions selon la recherche et la période
  const filteredMentions = mentions.filter(mention => {
    // Filtre recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const text = (mention.comment_text || '').toLowerCase();
      const author = (mention.comment_author || '').toLowerCase();
      const pageName = (mention.page_name || '').toLowerCase();
      const keywordsStr = Array.isArray(mention.brand_keywords) 
        ? mention.brand_keywords.join(' ').toLowerCase()
        : (mention.brand_keywords || '').toLowerCase();
      
      if (!text.includes(query) && !author.includes(query) && !pageName.includes(query) && !keywordsStr.includes(query)) {
        return false;
      }
    }
    
    // Filtre période
    if (periodFilter !== 'all' && mention.created_at) {
      const mentionDate = new Date(mention.created_at);
      const now = new Date();
      
      switch (periodFilter) {
        case 'today':
          if (!isAfter(mentionDate, subDays(now, 1))) return false;
          break;
        case 'week':
          if (!isAfter(mentionDate, subWeeks(now, 1))) return false;
          break;
        case 'month':
          if (!isAfter(mentionDate, subMonths(now, 1))) return false;
          break;
      }
    }
    
    return true;
  });

  // Fonction d'export CSV
  const handleExportCSV = async () => {
    if (filteredMentions.length === 0) {
      toast({
        title: 'Aucune donnée',
        description: 'Aucune mention à exporter',
        variant: 'destructive',
      });
      return;
    }

    setExporting(true);
    try {
      // Préparer les données CSV
      const headers = ['ID', 'Date', 'Page Source', 'Type', 'Priorité', 'Statut', 'Mots-clés', 'Texte', 'Lien Post'];
      const rows = filteredMentions.map(m => {
        const keywordsArr = Array.isArray(m.brand_keywords) 
          ? m.brand_keywords 
          : (typeof m.brand_keywords === 'string' ? JSON.parse(m.brand_keywords || '[]') : []);
        
        return [
          m.id,
          m.created_at ? format(new Date(m.created_at), 'dd/MM/yyyy HH:mm') : '',
          m.comment_author || m.page_name || '',
          m.mention_type === 'recommendation' ? 'Recommandation' : m.mention_type === 'question' ? 'Question' : 'Plainte',
          m.priority_level,
          m.status === 'new' ? 'Nouveau' : 'Traité',
          keywordsArr.join(', '),
          `"${(m.comment_text || '').replace(/"/g, '""')}"`,
          m.post_url || '',
        ];
      });

      // Créer le contenu CSV
      const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.join(';'))
      ].join('\n');

      // Télécharger le fichier
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mentions_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export réussi',
        description: `${filteredMentions.length} mention(s) exportée(s)`,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Erreur lors de l\'export',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  // Fonction pour mettre en surbrillance les mots-clés dans le texte
  const highlightKeywords = (text: string, keywordsToHighlight: string[]): React.ReactNode => {
    if (!text || keywordsToHighlight.length === 0) return text;
    
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Créer une regex pour tous les mots-clés (insensible à la casse)
    const regex = new RegExp(`(${keywordsToHighlight.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    
    let match;
    while ((match = regex.exec(text)) !== null) {
      // Ajouter le texte avant le match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      // Ajouter le mot-clé en surbrillance
      parts.push(
        <mark key={match.index} className="bg-yellow-200 text-yellow-900 px-0.5 rounded font-medium">
          {match[0]}
        </mark>
      );
      lastIndex = regex.lastIndex;
    }
    // Ajouter le reste du texte
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 0 ? <>{parts}</> : text;
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl bg-cream-50 min-h-screen pt-12 md:pt-4">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 flex items-center gap-2 text-navy">
            <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-gold" />
            Surveillance
          </h1>
          <p className="text-steel text-sm sm:text-base">
            Détectez les mentions de votre marque
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard/mentions/settings')}
            className="border-cream-300 text-navy-700 hover:bg-cream-100 flex items-center gap-1 sm:gap-2"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Paramètres</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAddKeywordModal(true)}
            className="bg-gold hover:bg-gold-600 text-white flex items-center gap-1 sm:gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Mot-clé</span>
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'mentions' | 'analyze')} className="w-full">
        <TabsList className="bg-white border border-cream-300 rounded-lg p-1 mb-4 sm:mb-6 w-full grid grid-cols-2">
          <TabsTrigger
            value="mentions"
            className="rounded-md px-2 sm:px-4 py-2 data-[state=active]:bg-gold data-[state=active]:text-white text-steel text-xs sm:text-sm"
          >
            <Bell className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Mentions
            {stats && stats.new > 0 && (
              <Badge className="ml-1 sm:ml-2 bg-red-500 text-white text-[10px] sm:text-xs">{stats.new}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="analyze"
            className="rounded-md px-2 sm:px-4 py-2 data-[state=active]:bg-gold data-[state=active]:text-white text-steel text-xs sm:text-sm"
          >
            <Search className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Analyser
          </TabsTrigger>
        </TabsList>

        {/* Tab: Analyser */}
        <TabsContent value="analyze" className="space-y-6">
          {/* Guide rapide */}
          <Card className="bg-gradient-to-r from-gold-50 to-gold-50 border-gold-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gold-100 rounded-full">
                  <Info className="w-6 h-6 text-gold-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-navy mb-2">Comment ça marche ?</h3>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gold text-white flex items-center justify-center text-xs font-bold">1</span>
                      <p className="text-navy-700">Ajoutez des <strong>mots-clés</strong> à surveiller (votre marque, produits, concurrents)</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gold text-white flex items-center justify-center text-xs font-bold">2</span>
                      <p className="text-navy-700">Cliquez sur <strong>"Analyser"</strong> sur une extraction Facebook existante</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gold text-white flex items-center justify-center text-xs font-bold">3</span>
                      <p className="text-navy-700">Consultez les <strong>mentions détectées</strong> classées par type et priorité</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mots-clés configurés */}
          <Card className="bg-white border-cream-300 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-navy flex items-center gap-2">
                  <Key className="w-5 h-5 text-gold" />
                  Mots-clés configurés
                </h3>
                <Button
                  size="sm"
                  onClick={() => setShowAddKeywordModal(true)}
                  className="bg-gold hover:bg-gold-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter
                </Button>
              </div>

              {loadingKeywords ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-steel-200" />
                </div>
              ) : !hasKeywords ? (
                <div className="text-center py-8 bg-cream-50 rounded-lg border-2 border-dashed border-cream-300">
                  <Key className="w-12 h-12 text-cream-400 mx-auto mb-3" />
                  <p className="text-steel font-medium mb-2">Aucun mot-clé configuré</p>
                  <p className="text-sm text-steel mb-4">Ajoutez votre premier mot-clé pour commencer la surveillance</p>
                  <Button onClick={() => setShowAddKeywordModal(true)} className="bg-gold hover:bg-gold-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un mot-clé
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Mots-clés manuels */}
                  {manualKeywords.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-steel mb-2 uppercase tracking-wide">Mode manuel</p>
                      <div className="flex flex-wrap gap-2">
                        {manualKeywords.map((kw) => (
                          <div
                            key={kw.id}
                            className="flex items-center gap-2 bg-gold-50 rounded-full px-3 py-1.5 border border-gold-200"
                          >
                            <span className="w-2 h-2 rounded-full bg-gold"></span>
                            <span className="font-medium text-navy text-sm">"{kw.keyword}"</span>
                            <span className="text-xs text-steel">{kw.mentionsCount} mentions</span>
                            <button
                              onClick={() => handleDeleteKeyword(kw.id)}
                              className="ml-1 text-steel-200 hover:text-red-500 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mots-clés CRON */}
                  {cronKeywords.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-steel mb-2 uppercase tracking-wide flex items-center gap-1">
                        <Zap className="w-3 h-3 text-steel-500" />
                        Surveillance automatique (CRON)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {cronKeywords.map((kw) => (
                          <div
                            key={kw.id}
                            className="flex items-center gap-2 bg-steel-50 rounded-full px-3 py-1.5 border border-steel-200"
                          >
                            <Zap className="w-3 h-3 text-steel-500" />
                            <span className="font-medium text-navy text-sm">"{kw.keyword}"</span>
                            <span className="text-xs text-steel">{kw.mentionsCount} mentions</span>
                            <button
                              onClick={() => handleDeleteKeyword(kw.id)}
                              className="ml-1 text-steel-200 hover:text-red-500 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sessions à analyser */}
          <Card className="bg-white border-cream-300 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-navy flex items-center gap-2">
                  <Facebook className="w-5 h-5 text-navy" />
                  Extractions Facebook disponibles
                </h3>
                <a href="/dashboard/extractions" className="text-sm text-gold hover:underline flex items-center gap-1">
                  Voir toutes <ChevronRight className="w-4 h-4" />
                </a>
              </div>

              {loadingSessions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-steel-200" />
                </div>
              ) : !hasSessions ? (
                <div className="text-center py-8 bg-cream-50 rounded-lg border-2 border-dashed border-cream-300">
                  <Facebook className="w-12 h-12 text-cream-400 mx-auto mb-3" />
                  <p className="text-steel font-medium mb-2">Aucune extraction Facebook</p>
                  <p className="text-sm text-steel mb-4">Lancez une extraction Facebook Pages pour pouvoir analyser les mentions</p>
                  <a href="/dashboard/facebook-pages">
                    <Button className="bg-navy hover:bg-navy-600">
                      <Facebook className="w-4 h-4 mr-2" />
                      Extraire des pages Facebook
                    </Button>
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.slice(0, 5).map((session) => (
                    <div
                      key={session.sessionId}
                      className="flex items-center justify-between p-4 bg-cream-50 rounded-lg border border-cream-300 hover:border-cream-300 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-navy-100 rounded-lg">
                          <Facebook className="w-5 h-5 text-navy" />
                        </div>
                        <div>
                          <p className="font-medium text-navy">
                            {session.pages.map(p => p.pageName).join(', ')}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-steel mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatSessionDate(session.createdAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {session.pages.reduce((acc, p) => acc + p.postsCount, 0)} posts
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleAnalyzeSession(session.sessionId)}
                        disabled={!hasKeywords || analyzingSession === session.sessionId}
                        className="bg-gold hover:bg-gold-600 text-white"
                      >
                        {analyzingSession === session.sessionId ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Analyse...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Analyser
                          </>
                        )}
                      </Button>
                    </div>
                  ))}

                  {sessions.length > 5 && (
                    <p className="text-center text-sm text-steel">
                      + {sessions.length - 5} autres extractions disponibles
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Mentions */}
        <TabsContent value="mentions" className="space-y-6">

          {/* Barre de recherche et filtres */}
          <Card className="bg-white border-cream-300 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Barre de recherche */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-steel-200" />
                  <Input
                    placeholder="Rechercher par texte, mot-clé, page..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white border-cream-300 text-navy placeholder:text-steel-200"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-steel-200 hover:text-steel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filtre période */}
                <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as typeof periodFilter)}>
                  <SelectTrigger className="w-full sm:w-[180px] bg-white border-cream-300">
                    <Filter className="w-4 h-4 mr-2 text-steel" />
                    <SelectValue placeholder="Période" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">Toutes les dates</SelectItem>
                    <SelectItem value="today">Aujourd'hui</SelectItem>
                    <SelectItem value="week">Cette semaine</SelectItem>
                    <SelectItem value="month">Ce mois</SelectItem>
                  </SelectContent>
                </Select>

                {/* Bouton Export */}
                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                  disabled={exporting || filteredMentions.length === 0}
                  className="border-cream-300 text-navy-700 hover:bg-cream-100"
                >
                  {exporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  <span className="hidden sm:inline">Exporter</span>
                  <span className="sm:hidden">CSV</span>
                </Button>
              </div>

              {/* Indicateur de résultats filtrés */}
              {(searchQuery || periodFilter !== 'all') && (
                <div className="mt-3 flex items-center gap-2 text-sm text-steel">
                  <span>
                    {filteredMentions.length} résultat{filteredMentions.length !== 1 ? 's' : ''}
                    {searchQuery && <> pour "<strong>{searchQuery}</strong>"</>}
                    {periodFilter !== 'all' && (
                      <> • {periodFilter === 'today' ? "Aujourd'hui" : periodFilter === 'week' ? 'Cette semaine' : 'Ce mois'}</>
                    )}
                  </span>
                  <button
                    onClick={() => { setSearchQuery(''); setPeriodFilter('all'); }}
                    className="text-gold hover:underline text-xs"
                  >
                    Réinitialiser
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-white border-cream-300 shadow-sm">
                <CardContent className="pt-6 text-center">
                  <Bell className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-navy">{stats.new}</p>
                  <p className="text-sm text-steel">Nouvelles mentions</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-cream-300 shadow-sm">
                <CardContent className="pt-6 text-center">
                  <ThumbsUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-navy">{stats.recommendations}</p>
                  <p className="text-sm text-steel">Recommandations</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-cream-300 shadow-sm">
                <CardContent className="pt-6 text-center">
                  <HelpCircle className="w-8 h-8 text-navy mx-auto mb-2" />
                  <p className="text-3xl font-bold text-navy">{stats.questions}</p>
                  <p className="text-sm text-steel">Questions</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-cream-300 shadow-sm">
                <CardContent className="pt-6 text-center">
                  <AlertTriangle className="w-8 h-8 text-gold mx-auto mb-2" />
                  <p className="text-3xl font-bold text-navy">{stats.complaints}</p>
                  <p className="text-sm text-steel">Plaintes</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Mentions List */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-gold-400" />
            </div>
          ) : mentions.length === 0 ? (
            <Card className="bg-white border-cream-300 shadow-sm">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-cream-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-navy-700 mb-2">
                    Aucune mention détectée
                  </h3>
                  <p className="text-steel mb-4">
                    Configurez vos mots-clés et analysez vos extractions Facebook
                  </p>
                  <Button onClick={() => setActiveTab('analyze')} className="bg-gold hover:bg-gold-600">
                    <Search className="w-4 h-4 mr-2" />
                    Lancer une analyse
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : filteredMentions.length === 0 ? (
            <Card className="bg-white border-cream-300 shadow-sm">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Search className="w-12 h-12 text-cream-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-navy-700 mb-2">
                    Aucun résultat
                  </h3>
                  <p className="text-steel mb-4">
                    Aucune mention ne correspond à vos critères de recherche
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => { setSearchQuery(''); setPeriodFilter('all'); }}
                    className="border-cream-300"
                  >
                    Réinitialiser les filtres
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredMentions.map((mention) => {
                // Parser les keywords si c'est une string JSON
                const keywordsArray = Array.isArray(mention.brand_keywords) 
                  ? mention.brand_keywords 
                  : (typeof mention.brand_keywords === 'string' 
                    ? JSON.parse(mention.brand_keywords || '[]') 
                    : []);
                
                return (
                  <Card
                    key={mention.id}
                    className={`bg-white border-l-4 shadow-sm hover:shadow-md transition-all duration-200 ${
                      mention.priority_level === 'urgent' 
                        ? 'border-l-red-500' 
                        : mention.priority_level === 'high'
                        ? 'border-l-gold'
                        : mention.mention_type === 'recommendation'
                        ? 'border-l-green-500'
                        : mention.mention_type === 'complaint'
                        ? 'border-l-red-400'
                        : 'border-l-navy'
                    }`}
                  >
                    <CardContent className="pt-4 pb-4">
                      {/* Header avec source et badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {/* Page source */}
                        <div className="flex items-center gap-1.5 text-sm">
                          <Facebook className="w-4 h-4 text-navy" />
                          <span className="font-medium text-navy">
                            {mention.comment_author || mention.page_name || 'Page Facebook'}
                          </span>
                        </div>
                        
                        {/* Séparateur */}
                        <span className="text-cream-400">•</span>
                        
                        {/* Date */}
                        <span className="text-xs text-steel flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {mention.comment_posted_at
                            ? format(new Date(mention.comment_posted_at), "d MMM yyyy 'à' HH:mm", { locale: fr })
                            : mention.created_at 
                            ? format(new Date(mention.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })
                            : 'Date inconnue'}
                        </span>
                        
                        {/* Priority badge */}
                        {mention.priority_level === 'urgent' && (
                          <Badge className="bg-red-500 text-white text-xs animate-pulse">
                            🚨 Urgent
                          </Badge>
                        )}
                        {mention.priority_level === 'high' && (
                          <Badge className="bg-gold text-white text-xs">
                            Priorité haute
                          </Badge>
                        )}
                      </div>

                      {/* Contenu du post avec mise en évidence des mots-clés */}
                      <div className="bg-cream-50 rounded-lg p-3 mb-3 border border-cream-200">
                        <p className="text-navy-700 text-sm leading-relaxed">
                          {highlightKeywords(mention.comment_text || '', keywordsArray)}
                        </p>
                      </div>

                      {/* Footer avec mots-clés détectés et actions */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Mots-clés détectés */}
                          <span className="text-xs text-steel">Mots-clés :</span>
                          {keywordsArray.map((kw: string, idx: number) => (
                            <Badge
                              key={idx}
                              className="bg-gold-100 text-gold-700 border border-gold-200 text-xs"
                            >
                              🔍 {kw}
                            </Badge>
                          ))}
                          
                          {/* Type de mention */}
                          <Badge
                            className={`text-xs ${
                              mention.mention_type === 'recommendation'
                                ? 'bg-green-100 text-green-700 border-green-200'
                                : mention.mention_type === 'question'
                                ? 'bg-navy-100 text-navy-700 border-navy-200'
                                : 'bg-red-100 text-red-700 border-red-200'
                            }`}
                          >
                            {mention.mention_type === 'recommendation' && '👍 Recommandation'}
                            {mention.mention_type === 'question' && '❓ Question'}
                            {mention.mention_type === 'complaint' && '⚠️ Plainte'}
                          </Badge>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {/* Lien vers le post */}
                          {mention.post_url && (
                            <a
                              href={mention.post_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-navy hover:underline flex items-center gap-1"
                            >
                              <ChevronRight className="w-3 h-3" />
                              Voir le post
                            </a>
                          )}
                          
                          {/* Bouton résoudre */}
                          {mention.status === 'new' ? (
                            <Button
                              size="sm"
                              variant={mention.priority_level === 'urgent' ? 'default' : 'outline'}
                              onClick={() => handleResolve(mention.id)}
                              className={mention.priority_level === 'urgent' 
                                ? 'bg-red-500 hover:bg-red-600 text-white text-xs' 
                                : 'border-cream-300 text-steel hover:bg-cream-100 text-xs'
                              }
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Traiter
                            </Button>
                          ) : (
                            <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Traité
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Keyword Modal */}
      <AddKeywordModal
        open={showAddKeywordModal}
        onOpenChange={setShowAddKeywordModal}
        onKeywordAdded={fetchKeywords}
      />
    </div>
  );
};

export default MentionsPage;
