import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Download,
  Play,
  Pause,
  Settings,
  BarChart3,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  DollarSign,
  Activity,
  Eye,
  FileJson,
  FileSpreadsheet,
  ExternalLink,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import api from '@/services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AutomationDetailViewProps {
  automation: any;
  onBack: () => void;
  onRefresh: () => void;
}

const AutomationDetailView: React.FC<AutomationDetailViewProps> = ({ automation, onBack, onRefresh }) => {
  const [executions, setExecutions] = useState<any[]>([]);
  const [changes, setChanges] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
  }, [automation.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [historyRes, statsRes, changesRes] = await Promise.all([
        api.get(`/automations/${automation.id}/history?limit=20`),
        api.get(`/automations/${automation.id}/stats`),
        api.get(`/automations/${automation.id}/changes?limit=50`),
      ]);

      setExecutions(historyRes.data.executions || []);
      setStats(statsRes.data.stats || {});
      setChanges(changesRes.data.changes || []);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: 'Erreur lors du chargement des données',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    try {
      await api.post(`/automations/${automation.id}/toggle`);
      toast({
        title: 'Succès',
        description: `Automatisation ${automation.is_active ? 'désactivée' : 'activée'}`,
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.message || 'Erreur',
        variant: 'destructive',
      });
    }
  };

  // Polling for post-trigger auto-refresh
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    pollCountRef.current = 0;
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const handleTrigger = async () => {
    try {
      await api.post(`/automations/${automation.id}/trigger`);
      toast({
        title: 'Scraping lance',
        description: 'Execution en cours. Mise a jour automatique.',
      });
      // Poll every 5s for up to 2 min
      stopPolling();
      pollCountRef.current = 0;
      pollRef.current = setInterval(async () => {
        pollCountRef.current++;
        await fetchData();
        if (pollCountRef.current >= 24) stopPolling();
      }, 5000);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.message || 'Erreur',
        variant: 'destructive',
      });
    }
  };

  const handleViewResults = (sessionId: string) => {
    window.location.href = `/dashboard/extractions?session=${sessionId}`;
  };

  const handleDownloadResults = async (executionId: string, format: 'json' | 'csv') => {
    try {
      const response = await api.get(`/automations/${automation.id}/executions/${executionId}/download?format=${format}`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `execution_${executionId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Téléchargement',
        description: `Fichier ${format.toUpperCase()} téléchargé avec succès`,
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.message || 'Erreur lors du téléchargement',
        variant: 'destructive',
      });
    }
  };

  // Préparer les données pour les graphiques
  const chartData = executions
    .slice(0, 10)
    .reverse()
    .map(exec => ({
      date: format(new Date(exec.created_at), 'dd/MM'),
      items: exec.items_scraped || 0,
      credits: exec.credits_used || 0,
      duration: exec.duration_seconds || 0,
    }));

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-navy animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-steel-200" />;
    }
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'price_change':
        return <DollarSign className="w-4 h-4 text-gold-400" />;
      case 'new_mention':
        return <Activity className="w-4 h-4 text-steel-400" />;
      case 'item_count':
        return <BarChart3 className="w-4 h-4 text-navy" />;
      default:
        return <AlertCircle className="w-4 h-4 text-steel-200" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-300 text-red-700';
      case 'high':
        return 'bg-gold-50 border-gold-300 text-gold-700';
      case 'medium':
        return 'bg-yellow-50 border-yellow-300 text-yellow-700';
      default:
        return 'bg-green-50 border-green-300 text-green-700';
    }
  };

  return (
    <div className="h-full bg-cream-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-cream-300 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-steel hover:text-navy"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-navy">{automation.name}</h1>
                {automation.is_paused && (
                  <Badge variant="outline" className="bg-gold-50 border-gold-300 text-gold-700">
                    En pause
                  </Badge>
                )}
                {automation.is_active && !automation.is_paused && (
                  <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700">
                    Active
                  </Badge>
                )}
              </div>
              {automation.description && (
                <p className="text-steel-200 mt-1">{automation.description}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggle}
              className="border-cream-300 text-navy-700 hover:bg-cream-100"
            >
              {automation.is_active && !automation.is_paused ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Mettre en pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Activer
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTrigger}
              className="border-gold-500 text-gold-600 hover:bg-gold-50"
            >
              <Play className="w-4 h-4 mr-2" />
              Lancer maintenant
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-steel-200">Taux de Réussite</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">{stats?.success_rate || 0}%</div>
              <p className="text-xs text-steel mt-1">
                {stats?.successful_runs || 0} / {stats?.total_runs || 0} exécutions
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-steel-200">Crédits Dépensés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gold-400">{stats?.total_credits_spent || 0}</div>
              <p className="text-xs text-steel mt-1">Total historique</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-steel-200">Changements Détectés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy">{stats?.total_changes_detected || 0}</div>
              <p className="text-xs text-steel mt-1">Modifications importantes</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-steel-200">Prochaine Exécution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-steel-400">
                {format(new Date(automation.next_run_at), 'd MMM', { locale: fr })}
              </div>
              <p className="text-xs text-steel mt-1">
                {format(new Date(automation.next_run_at), 'HH:mm', { locale: fr })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-cream-100">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
            <TabsTrigger value="changes">Changements</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-white border-cream-300 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-navy">Items Extraits</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#D5CCC1" />
                      <XAxis dataKey="date" stroke="#547792" />
                      <YAxis stroke="#547792" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #D5CCC1', borderRadius: '8px' }}
                        labelStyle={{ color: '#1A3263' }}
                      />
                      <Line type="monotone" dataKey="items" stroke="#1A3263" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-white border-cream-300 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-navy">Crédits Utilisés</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#D5CCC1" />
                      <XAxis dataKey="date" stroke="#547792" />
                      <YAxis stroke="#547792" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #D5CCC1', borderRadius: '8px' }}
                        labelStyle={{ color: '#1A3263' }}
                      />
                      <Bar dataKey="credits" fill="#FAB95B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Configuration */}
            <Card className="bg-white border-cream-300 shadow-sm">
              <CardHeader>
                <CardTitle className="text-navy">Configuration</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-steel">Type</p>
                  <p className="text-navy font-medium">
                    {automation.scrape_type === 'marketplace' ? 'Marketplace' : 'Facebook Pages'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-steel">Fréquence</p>
                  <p className="text-navy font-medium">
                    {automation.frequency === 'daily' ? 'Quotidien' : automation.frequency === 'weekly' ? 'Hebdomadaire' : 'Mensuel'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-steel">URL Cible</p>
                  <p className="text-steel-200 font-medium truncate">{automation.target_url}</p>
                </div>
                <div>
                  <p className="text-sm text-steel">Coût par Exécution</p>
                  <p className="text-navy font-medium">{automation.credits_per_run} crédits</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4 mt-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-steel-500" />
              </div>
            ) : executions.length === 0 ? (
              <Card className="bg-white border-cream-300 shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="w-16 h-16 text-steel mb-4" />
                  <p className="text-steel-200">Aucune exécution pour le moment</p>
                </CardContent>
              </Card>
            ) : (
              executions.map((exec) => (
                <Card key={exec.id} className="bg-white border-cream-300 shadow-sm">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getStatusIcon(exec.status)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-navy">
                              {format(new Date(exec.created_at), 'd MMMM yyyy à HH:mm', { locale: fr })}
                            </span>
                            <Badge variant="outline" className={
                              exec.status === 'completed' ? 'bg-green-50 border-green-300 text-green-700' :
                              exec.status === 'failed' ? 'bg-red-50 border-red-300 text-red-700' :
                              'bg-navy-50 border-navy-200 text-navy'
                            }>
                              {exec.status === 'completed' ? 'Succès' : exec.status === 'failed' ? 'Échec' : 'En cours'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-steel">Items extraits</p>
                              <p className="text-navy font-medium">{exec.items_scraped || 0}</p>
                            </div>
                            <div>
                              <p className="text-steel">Crédits utilisés</p>
                              <p className="text-navy font-medium">{exec.credits_used || 0}</p>
                            </div>
                            <div>
                              <p className="text-steel">Durée</p>
                              <p className="text-navy font-medium">
                                {exec.duration_seconds ? `${Math.round(exec.duration_seconds / 60)}min` : '-'}
                              </p>
                            </div>
                          </div>

                          {exec.error_message && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                              <strong>Erreur:</strong> {exec.error_message}
                            </div>
                          )}

                          {/* Actions pour chaque exécution */}
                          <div className="mt-4 flex flex-wrap gap-2">
                            {exec.session_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-navy-200 text-navy hover:bg-navy-50"
                                onClick={() => handleViewResults(exec.session_id)}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Voir les données
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-300 text-green-700 hover:bg-green-50"
                              onClick={() => handleDownloadResults(exec.id, 'json')}
                            >
                              <FileJson className="w-3 h-3 mr-1" />
                              JSON
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-gold-300 text-gold-700 hover:bg-gold-50"
                              onClick={() => handleDownloadResults(exec.id, 'csv')}
                            >
                              <FileSpreadsheet className="w-3 h-3 mr-1" />
                              CSV
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Changes Tab */}
          <TabsContent value="changes" className="space-y-4 mt-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-steel-500" />
              </div>
            ) : changes.length === 0 ? (
              <Card className="bg-white border-cream-300 shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <TrendingUp className="w-16 h-16 text-steel mb-4" />
                  <p className="text-steel-200">Aucun changement détecté</p>
                </CardContent>
              </Card>
            ) : (
              changes.map((change, idx) => (
                <Card key={idx} className="bg-white border-cream-300 shadow-sm">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      {getChangeIcon(change.change_type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-steel-200 capitalize">
                            {change.change_type.replace('_', ' ')}
                          </span>
                          <Badge variant="outline" className={getSeverityColor(change.severity)}>
                            {change.severity}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-steel">Ancienne valeur</p>
                            <p className="text-navy">{change.old_value || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-steel">Nouvelle valeur</p>
                            <p className="text-navy">{change.new_value || 'N/A'}</p>
                          </div>
                        </div>

                        {change.metadata && Object.keys(change.metadata).length > 0 && (
                          <div className="mt-3 p-3 bg-cream-50 border border-cream-300 rounded text-sm">
                            <pre className="text-navy overflow-x-auto">
                              {JSON.stringify(change.metadata, null, 2)}
                            </pre>
                          </div>
                        )}

                        <p className="text-xs text-steel mt-2">
                          {format(new Date(change.created_at), 'd MMMM yyyy à HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AutomationDetailView;
