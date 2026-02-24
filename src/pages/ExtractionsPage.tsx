import React, { useState } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  ShoppingBag,
  Facebook,
  Download,
  Eye,
  Calendar,
  FileDown,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Package,
  FolderOpen,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Session } from '@/types';
import api from '@/services/api';
import { toast } from '@/hooks/use-toast';
import SessionItemsView from '@/components/dashboard/SessionItemsView';
import FacebookPagesSessionCard from '@/components/dashboard/FacebookPagesSessionCard';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '@/components/dashboard/DashboardHeader';

const ExtractionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { userData, error, isLoading, fetchDashboardData } = useDashboard();

  React.useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);
  const [activeTab, setActiveTab] = useState<'all' | 'marketplace' | 'facebook'>('all');
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentDownload, setCurrentDownload] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedMarketplaceSessionId, setSelectedMarketplaceSessionId] = useState<string | null>(null);
  const [selectedFacebookSessionId, setSelectedFacebookSessionId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh] bg-cream-50">
        <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream-50 p-8">
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center">
              <AlertCircle className="mr-2" />
              Erreur
            </CardTitle>
          </CardHeader>
          <CardContent className="text-red-300">
            {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userData) {
    return <div className="container mx-auto p-4">Aucune donnée disponible.</div>;
  }

  const { sessions = [] } = userData;

  // Séparer les sessions par type
  const marketplaceSessions = sessions.filter((s: Session) => 
    (!s.scrape_type || s.scrape_type === 'marketplace') &&
    s.status === 'completed'
  );

  const facebookPagesSessions = sessions.filter((s: Session) => 
    s.scrape_type === 'facebook_pages' &&
    (s.status === 'completed' || s.status === 'running')
  );

  // Utiliser toutes les sessions sans filtre
  const filteredMarketplace = marketplaceSessions;
  const filteredFacebook = facebookPagesSessions;

  const handleDownload = async (session: Session, format: 'excel' | 'csv') => {
    const extension = format === 'excel' ? 'xlsx' : 'csv';
    const filename = `marketplace_${session.id}.${extension}`;
    
    setDownloading(true);
    setDownloadProgress(0);
    setCurrentDownload(filename);
    setCurrentSessionId(session.id);
    
    try {
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 200);

      const response = await api.get(`/sessions/${session.id}/download`, {
        params: { format, token: session.downloadToken, pack_id: session.packId },
        responseType: 'blob',
      });

      clearInterval(progressInterval);
      setDownloadProgress(100);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast({ 
        title: "✅ Téléchargement réussi", 
        description: `${filename} a été téléchargé avec succès.` 
      });
    } catch (error: any) {
      toast({ 
        title: "❌ Erreur", 
        description: error.response?.data?.message || "Erreur lors du téléchargement", 
        variant: "destructive" 
      });
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
      setCurrentDownload(null);
      setCurrentSessionId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      'completed': { label: 'Terminé', className: 'bg-green-500/10 text-green-400 border-green-500/20' },
      'running': { label: 'En cours', className: 'bg-navy/10 text-navy-400 border-navy/20' },
      'failed': { label: 'Échoué', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
    };
    const { label, className } = config[status] || config['completed'];
    return <Badge variant="outline" className={className}>{label}</Badge>;
  };

  // Vue détaillée Marketplace
  if (selectedMarketplaceSessionId) {
    const selectedSession = marketplaceSessions.find(s => s.id === selectedMarketplaceSessionId);
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          onClick={() => setSelectedMarketplaceSessionId(null)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux extractions
        </Button>
        <SessionItemsView
          sessionId={selectedMarketplaceSessionId}
          sessionUrl={selectedSession?.url}
        />
      </div>
    );
  }

  // Vue détaillée Facebook Pages - rediriger vers la page dédiée
  if (selectedFacebookSessionId) {
    navigate(`/dashboard/facebook-pages?session=${selectedFacebookSessionId}`);
    return null;
  }

  return (
    <div className="h-full bg-cream-50">
      <DashboardHeader />
      
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 pt-12 md:pt-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy">Mes Extractions</h1>
          <p className="text-steel mt-1">
            Gérez toutes vos extractions Marketplace et Facebook Pages
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-navy-700">Total Extractions</CardTitle>
              <Package className="h-4 w-4 text-steel" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-navy">{marketplaceSessions.length + facebookPagesSessions.length}</div>
              <p className="text-xs text-steel">Toutes plateformes</p>
            </CardContent>
          </Card>

        <Card className="bg-white border-cream-300 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-navy-700">Marketplace</CardTitle>
            <ShoppingBag className="h-4 w-4 text-navy-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-navy">{marketplaceSessions.length}</div>
            <p className="text-xs text-steel">{marketplaceSessions.reduce((sum, s) => sum + (s.totalItems || 0), 0)} items</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-cream-300 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-navy-700">Facebook Pages</CardTitle>
            <Facebook className="h-4 w-4 text-steel-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-navy">{facebookPagesSessions.length}</div>
            <p className="text-xs text-steel">{facebookPagesSessions.reduce((sum, s) => sum + (s.sub_sessions?.length || 0), 0)} pages</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-cream-300 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-navy-700">Analyses IA</CardTitle>
            <Sparkles className="h-4 w-4 text-steel-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-navy">{userData.stats?.totalAiAnalyses || 0}</div>
            <p className="text-xs text-steel">Voir les analyses →</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="all" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
            <FolderOpen className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Tout</span> ({filteredMarketplace.length + filteredFacebook.length})
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
            <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Marketplace</span> ({filteredMarketplace.length})
          </TabsTrigger>
          <TabsTrigger value="facebook" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
            <Facebook className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Facebook</span> ({filteredFacebook.length})
          </TabsTrigger>
        </TabsList>

        {/* All Tab */}
        <TabsContent value="all" className="space-y-6 mt-6">
          {/* Facebook Pages Section */}
          {filteredFacebook.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-cream-300">
                <div className="p-2 bg-gradient-to-r from-navy to-navy-600 rounded-lg">
                  <Facebook className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-navy">Facebook Pages</h3>
                  <p className="text-xs text-steel">{filteredFacebook.length} extraction{filteredFacebook.length > 1 ? 's' : ''}</p>
                </div>
              </div>
              {filteredFacebook.slice(0, 3).map((session) => (
                <FacebookPagesSessionCard 
                  key={session.id} 
                  session={session} 
                  onViewItems={(id) => navigate(`/dashboard/facebook-pages?session=${id}`)}
                />
              ))}
              {filteredFacebook.length > 3 && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setActiveTab('facebook')}
                >
                  Voir toutes les extractions Facebook Pages ({filteredFacebook.length})
                </Button>
              )}
            </div>
          )}

          {/* Marketplace Section */}
          {filteredMarketplace.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-cream-300">
                <div className="p-2 bg-gradient-to-r from-navy to-navy-600 rounded-lg">
                  <ShoppingBag className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-navy">Marketplace</h3>
                  <p className="text-xs text-steel">{filteredMarketplace.length} extraction{filteredMarketplace.length > 1 ? 's' : ''}</p>
                </div>
              </div>
              {filteredMarketplace.slice(0, 3).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 bg-white border border-cream-300 rounded-lg hover:border-cream-300 shadow-sm transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-3 bg-navy/20 rounded-full">
                      <ShoppingBag className="h-5 w-5 text-navy-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-medium text-navy">Session Marketplace</p>
                        {getStatusBadge(session.status)}
                      </div>
                      <p className="text-sm text-steel-200 truncate">
                        {session.totalItems ? `${session.totalItems} items extraits` : 'Extraction complète'}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-steel">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(session.created_at), "d MMM yyyy, HH:mm", { locale: fr })}
                        </div>
                        <code className="font-mono text-steel">• {session.id}</code>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedMarketplaceSessionId(session.id)}
                      className="px-2 sm:px-3"
                    >
                      <Eye className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Voir</span>
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleDownload(session, 'excel')}
                      disabled={downloading && currentSessionId === session.id}
                      className="px-2 sm:px-3"
                    >
                      {downloading && currentSessionId === session.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <FileDown className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Excel</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
              {filteredMarketplace.length > 3 && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setActiveTab('marketplace')}
                >
                  Voir toutes les extractions Marketplace ({filteredMarketplace.length})
                </Button>
              )}
            </div>
          )}

          {filteredMarketplace.length === 0 && filteredFacebook.length === 0 && (
            <div className="text-center py-12 text-steel">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune extraction trouvée</p>
              <p className="text-sm mt-2">Lancez votre première extraction</p>
              <div className="flex items-center justify-center gap-3 mt-4">
                <Button onClick={() => navigate('/marketplace')}>
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Marketplace
                </Button>
                <Button variant="outline" onClick={() => navigate('/facebook-pages')}>
                  <Facebook className="w-4 h-4 mr-2" />
                  Facebook Pages
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Marketplace Tab */}
        <TabsContent value="marketplace" className="mt-6">
          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-navy">
                <span className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-navy-400" />
                  Extractions Marketplace
                </span>
                <Badge variant="secondary">
                  {filteredMarketplace.length} session{filteredMarketplace.length > 1 ? 's' : ''}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredMarketplace.length === 0 ? (
                <div className="text-center py-12 text-steel">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune extraction Marketplace</p>
                  <Button className="mt-4" onClick={() => navigate('/marketplace')}>
                    Lancer une extraction
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredMarketplace.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 bg-white border border-cream-300 rounded-lg hover:border-cream-300 shadow-sm transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="p-3 bg-navy/20 rounded-full">
                          <ShoppingBag className="h-5 w-5 text-navy-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-medium text-navy">Session Marketplace</p>
                            {getStatusBadge(session.status)}
                          </div>
                          <p className="text-sm text-steel truncate">
                            {session.totalItems ? `${session.totalItems} items extraits` : 'Extraction complète'}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-steel">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(session.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                            </div>
                            <code className="font-mono text-xs">
                              ID: {session.id}
                            </code>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedMarketplaceSessionId(session.id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Voir les items
                        </Button>
                        {session.status === 'completed' && (
                          <div className="flex gap-1">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleDownload(session, 'excel')}
                              disabled={downloading && currentSessionId === session.id}
                            >
                              {downloading && currentSessionId === session.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <FileDown className="h-4 w-4 mr-2" />
                                  Excel
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(session, 'csv')}
                              disabled={downloading && currentSessionId === session.id}
                            >
                              CSV
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Facebook Pages Tab */}
        <TabsContent value="facebook" className="mt-6">
          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-navy">
                <span className="flex items-center gap-2">
                  <Facebook className="h-5 w-5 text-navy-400" />
                  Extractions Facebook Pages
                </span>
                <Badge variant="secondary">
                  {filteredFacebook.length} session{filteredFacebook.length > 1 ? 's' : ''}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredFacebook.length === 0 ? (
                <div className="text-center py-12 text-steel">
                  <Facebook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune extraction Facebook Pages</p>
                  <Button className="mt-4" onClick={() => navigate('/facebook-pages')}>
                    Lancer une extraction
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredFacebook.map((session) => (
                    <FacebookPagesSessionCard 
                      key={session.id} 
                      session={session} 
                      onViewItems={(id) => navigate(`/dashboard/facebook-pages?session=${id}`)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
};

export default ExtractionsPage;
