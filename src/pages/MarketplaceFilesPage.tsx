import React, { useState } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  ShoppingBag,
  Download,
  Eye,
  Search,
  Calendar,
  FileDown,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Package
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Session } from '@/types';
import api from '@/services/api';
import { toast } from '@/hooks/use-toast';
import SessionItemsView from '@/components/dashboard/SessionItemsView';

const MarketplaceFilesPage: React.FC = () => {
  const { userData, error, isLoading } = useDashboard();
  const [searchQuery, setSearchQuery] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentDownload, setCurrentDownload] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

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

  const { sessions = [] } = userData;

  const marketplaceSessions = sessions.filter(s => 
    (!s.scrape_type || s.scrape_type === 'marketplace') &&
    (s.status === 'completed' || (s.is_trial && s.status === 'completed'))
  );

  const filteredSessions = marketplaceSessions.filter(session => {
    if (!searchQuery) return true;
    return (
      session.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.url?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.totalItems?.toString().includes(searchQuery)
    );
  });

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
      'completed': { label: 'Terminé', className: 'bg-green-50 text-green-700 border-green-200' },
      'running': { label: 'En cours', className: 'bg-navy-50 text-navy border-navy-200' },
      'failed': { label: 'Échoué', className: 'bg-red-50 text-red-700 border-red-200' },
    };
    const { label, className } = config[status] || config['completed'];
    return <Badge variant="outline" className={className}>{label}</Badge>;
  };

  if (selectedSessionId) {
    const selectedSession = marketplaceSessions.find(s => s.id === selectedSessionId);
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          onClick={() => setSelectedSessionId(null)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux sessions
        </Button>
        <SessionItemsView
          sessionId={selectedSessionId}
          sessionUrl={selectedSession?.url}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-14 md:pt-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 sm:h-8 sm:w-8" />
          Fichiers Marketplace
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Gérez vos extractions Marketplace
        </p>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{marketplaceSessions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Extractions disponibles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Items Extraits</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {marketplaceSessions.reduce((sum, s) => sum + (s.totalItems || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Annonces totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Essais Gratuits</CardTitle>
            <FileDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {marketplaceSessions.filter(s => s.is_trial).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Sessions d'essai</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rechercher</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par ID, URL ou nombre d'items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {downloading && currentDownload && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Téléchargement en cours...</span>
                <span className="text-muted-foreground">{downloadProgress}%</span>
              </div>
              <Progress value={downloadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">{currentDownload}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Sessions Marketplace</span>
            <Badge variant="secondary">
              {filteredSessions.length} session{filteredSessions.length > 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune session trouvée</p>
              <p className="text-sm mt-2">
                {searchQuery 
                  ? 'Essayez de modifier votre recherche' 
                  : 'Lancez votre première extraction Marketplace'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <ShoppingBag className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-medium">Session Marketplace</p>
                        {/* Trial badge removed: free trial no longer offered */}
                        {getStatusBadge(session.status)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {session.totalItems ? `${session.totalItems} items extraits` : 'Extraction complète'}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(session.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                        </div>
                        <div className="font-mono text-xs">
                          ID: {session.id.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSessionId(session.id)}
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
    </div>
  );
};

export default MarketplaceFilesPage;