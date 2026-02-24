import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Play,
  Pause,
  Trash2,
  Edit,
  Calendar,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  Settings,
  BarChart3,
  Zap,
  DollarSign,
  Eye,
  Sparkles,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import api from '@/services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import CreateAutomationModal from '@/components/automations/CreateAutomationModal';
import AutomationDetailView from '@/components/automations/AutomationDetailView';
import { useCredits } from '@/hooks/useCredits';

interface ScheduledScrape {
  id: string;
  name: string;
  description?: string;
  scrape_type: 'marketplace' | 'facebook_pages' | 'posts_comments';
  target_url: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  next_run_at: string;
  last_run_at?: string;
  is_active: boolean;
  is_paused: boolean;
  pause_reason?: string;
  config: any;
  notification_settings: any;
  credits_per_run: number;
  total_credits_spent: number;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  created_at: string;
  last_execution?: any;
}

const AutomationsPage: React.FC = () => {
  const [automations, setAutomations] = useState<ScheduledScrape[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<ScheduledScrape | null>(null);
  const [triggeringIds, setTriggeringIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'active' | 'paused' | 'all'>('active');
  const { balance, refreshBalance } = useCredits();

  useEffect(() => {
    fetchAutomations();
  }, []);

  const fetchAutomations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/automations');
      setAutomations(response.data.scheduledScrapes || []);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.message || 'Erreur lors du chargement des automatisations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutomation = async (id: string, currentState: boolean) => {
    try {
      await api.post(`/automations/${id}/toggle`, { is_active: !currentState });
      toast({
        title: 'Succès',
        description: `Automatisation ${!currentState ? 'activée' : 'désactivée'}`,
      });
      fetchAutomations();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.message || 'Erreur lors du changement d\'état',
        variant: 'destructive',
      });
    }
  };

  const handleTriggerManually = async (id: string) => {
    setTriggeringIds(prev => new Set(prev).add(id));
    try {
      await api.post(`/automations/${id}/trigger`);
      toast({
        title: '🚀 Scraping lancé',
        description: 'L\'exécution est en cours en arrière-plan. Rafraîchissez dans quelques minutes pour voir les résultats.',
      });
      // Rafraîchir après 3 secondes pour mettre à jour les stats
      setTimeout(() => {
        fetchAutomations();
      }, 3000);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.message || 'Erreur lors du déclenchement',
        variant: 'destructive',
      });
    } finally {
      setTriggeringIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleDeleteAutomation = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette automatisation ?')) {
      return;
    }

    try {
      await api.delete(`/automations/${id}`);
      toast({
        title: 'Succès',
        description: 'Automatisation supprimée',
      });
      fetchAutomations();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.message || 'Erreur lors de la suppression',
        variant: 'destructive',
      });
    }
  };

  const handleViewLastExecution = async (automation: ScheduledScrape) => {
    // Si pas d'exécution du tout
    if (!automation.last_execution) {
      toast({
        title: 'Aucune exécution',
        description: 'Cette automatisation n\'a pas encore été exécutée',
        variant: 'destructive',
      });
      return;
    }
    
    // Si l'exécution a échoué ou n'a pas de session_id
    if (!automation.last_execution.session_id) {
      // Afficher les détails de l'exécution dans un toast informatif
      const status = automation.last_execution.status;
      const errorMsg = automation.last_execution.error_message;
      
      if (status === 'failed') {
        toast({
          title: 'Exécution échouée',
          description: errorMsg || 'L\'exécution a échoué sans générer de données. Consultez les détails de l\'automatisation.',
          variant: 'destructive',
        });
      } else if (status === 'running' || status === 'pending') {
        toast({
          title: 'Exécution en cours',
          description: 'L\'exécution est toujours en cours. Veuillez patienter.',
        });
      } else {
        toast({
          title: 'Données non disponibles',
          description: 'Les résultats de cette exécution ne sont pas disponibles. Cliquez sur la carte pour voir les détails.',
          variant: 'destructive',
        });
      }
      return;
    }
    
    // Rediriger vers la page d'extraction avec le session_id
    window.location.href = `/dashboard/extractions?session=${automation.last_execution.session_id}`;
  };

  const handleLaunchAIAnalysis = async (automation: ScheduledScrape) => {
    if (!automation.last_execution?.session_id) {
      toast({
        title: 'Aucune exécution',
        description: 'Lancez d\'abord une exécution pour analyser les données',
        variant: 'destructive',
      });
      return;
    }
    // Rediriger vers la page d'analyse IA avec le session_id
    window.location.href = `/dashboard/ai-analyses?session=${automation.last_execution.session_id}&autostart=true`;
  };

  const filteredAutomations = automations.filter(auto => {
    if (activeTab === 'active') return auto.is_active && !auto.is_paused;
    if (activeTab === 'paused') return auto.is_paused || !auto.is_active;
    return true;
  });

  const stats = {
    total: automations.length,
    active: automations.filter(a => a.is_active && !a.is_paused).length,
    paused: automations.filter(a => a.is_paused || !a.is_active).length,
    totalRuns: automations.reduce((sum, a) => sum + a.total_runs, 0),
    totalCreditsSpent: automations.reduce((sum, a) => sum + a.total_credits_spent, 0),
    estimatedMonthlyCost: automations
      .filter(a => a.is_active && !a.is_paused)
      .reduce((sum, a) => {
        const runsPerMonth = a.frequency === 'daily' ? 30 : a.frequency === 'weekly' ? 4 : 1;
        return sum + (a.credits_per_run * runsPerMonth);
      }, 0),
  };

  if (selectedAutomation) {
    return (
      <AutomationDetailView
        automation={selectedAutomation}
        onBack={() => {
          setSelectedAutomation(null);
          fetchAutomations();
        }}
        onRefresh={fetchAutomations}
      />
    );
  }

  return (
    <div className="h-full bg-cream-50">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 pt-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-navy">Automatisations</h1>
            <p className="text-steel mt-1 text-sm sm:text-base">Surveillez automatiquement vos pages</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gold hover:bg-gold-600 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="sm:inline">Nouvelle</span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-navy-700">Automatisations Actives</CardTitle>
              <Zap className="h-5 w-5 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-green-400">{stats.active}</div>
              <p className="text-xs text-steel-200 mt-1">sur {stats.total} total</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-navy-700">Exécutions Totales</CardTitle>
              <BarChart3 className="h-5 w-5 text-navy" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-navy">{stats.totalRuns}</div>
              <p className="text-xs text-steel-200 mt-1">Tous les temps</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-navy-700">Crédits Utilisés</CardTitle>
              <DollarSign className="h-5 w-5 text-gold-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-gold-400">{stats.totalCreditsSpent}</div>
              <p className="text-xs text-steel-200 mt-1">Historique</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-navy-700">Coût Mensuel Estimé</CardTitle>
              <TrendingUp className="h-5 w-5 text-steel-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-steel-400">{stats.estimatedMonthlyCost}</div>
              <p className="text-xs text-steel-200 mt-1">crédits/mois</p>
            </CardContent>
          </Card>
        </div>

        {/* Credit Warning */}
        {balance && balance.balance < stats.estimatedMonthlyCost && stats.active > 0 && (
          <Card className="bg-gold-50 border-gold-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-gold-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gold-800">Crédits insuffisants</h3>
                  <p className="text-sm text-gold-700 mt-1">
                    Votre solde actuel ({balance.balance} crédits) est inférieur au coût mensuel estimé ({stats.estimatedMonthlyCost} crédits).
                    Les automatisations seront mises en pause automatiquement si vous manquez de crédits.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 border-gold-500 text-gold-600 hover:bg-gold-100"
                    onClick={() => window.location.href = '/dashboard/credits'}
                  >
                    Recharger mes crédits
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <TabsList className="grid w-full grid-cols-3 bg-white border border-cream-300 shadow-sm h-auto">
            <TabsTrigger value="active" className="data-[state=active]:bg-gold data-[state=active]:text-white text-steel text-xs sm:text-sm py-2">
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Actives</span> ({stats.active})
            </TabsTrigger>
            <TabsTrigger value="paused" className="data-[state=active]:bg-gold data-[state=active]:text-white text-steel text-xs sm:text-sm py-2">
              <Pause className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Pause</span> ({stats.paused})
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-gold data-[state=active]:text-white text-steel text-xs sm:text-sm py-2">
              <span className="hidden sm:inline">Toutes</span> ({stats.total})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-steel-500" />
              </div>
            ) : filteredAutomations.length === 0 ? (
              <Card className="bg-white border-cream-300 border-dashed shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="w-16 h-16 text-steel mb-4" />
                  <h3 className="text-lg font-semibold text-navy-700 mb-2">
                    Aucune automatisation {activeTab === 'active' ? 'active' : activeTab === 'paused' ? 'en pause' : ''}
                  </h3>
                  <p className="text-steel text-center max-w-md mb-4">
                    Créez votre première automatisation pour surveiller automatiquement vos pages et concurrents
                  </p>
                  <Button onClick={() => setShowCreateModal(true)} className="bg-gold hover:bg-gold-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Créer une automatisation
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {filteredAutomations.map((automation) => (
                  <Card
                    key={automation.id}
                    className="bg-white border-cream-300 shadow-sm hover:border-gold-300 transition-colors cursor-pointer"
                    onClick={() => setSelectedAutomation(automation)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-navy text-lg">{automation.name}</CardTitle>
                            {automation.is_paused && (
                              <Badge variant="outline" className="bg-gold-100 border-gold-300 text-gold-600">
                                En pause
                              </Badge>
                            )}
                            {automation.is_active && !automation.is_paused && (
                              <Badge variant="outline" className="bg-green-100 border-green-300 text-green-600">
                                Active
                              </Badge>
                            )}
                          </div>
                          {automation.description && (
                            <CardDescription className="text-steel">{automation.description}</CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Info */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-steel">Type</p>
                          <p className="text-navy font-medium">
                            {automation.scrape_type === 'marketplace' ? 'Marketplace' : 
                             automation.scrape_type === 'posts_comments' ? 'Posts & Commentaires' : 
                             'Facebook Pages'}
                          </p>
                        </div>
                        <div>
                          <p className="text-steel">Fréquence</p>
                          <p className="text-navy font-medium">
                            {automation.frequency === 'daily' ? 'Quotidien' : automation.frequency === 'weekly' ? 'Hebdomadaire' : 'Mensuel'}
                          </p>
                        </div>
                        <div>
                          <p className="text-steel">Dernière exécution</p>
                          <p className="text-navy font-medium flex items-center gap-1">
                            {automation.last_execution ? (
                              <>
                                {automation.last_execution.status === 'completed' ? (
                                  <CheckCircle className="w-3 h-3 text-green-400" />
                                ) : automation.last_execution.status === 'failed' ? (
                                  <AlertCircle className="w-3 h-3 text-red-400" />
                                ) : (
                                  <Loader2 className="w-3 h-3 text-gold-400 animate-spin" />
                                )}
                                {format(new Date(automation.last_execution.created_at), 'd MMM HH:mm', { locale: fr })}
                              </>
                            ) : (
                              <span className="text-steel">Jamais</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-steel">Prochaine exécution</p>
                          <p className="text-navy font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(automation.next_run_at), 'd MMM HH:mm', { locale: fr })}
                          </p>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 pt-3 border-t border-cream-300">
                        <div className="flex items-center gap-2 text-sm">
                          <BarChart3 className="w-4 h-4 text-navy" />
                          <span className="text-steel">{automation.total_runs} exécutions</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-steel">{automation.successful_runs} succès</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="w-4 h-4 text-gold-400" />
                          <span className="text-steel">{automation.total_credits_spent} crédits</span>
                        </div>
                      </div>

                      {/* Actions Rapides */}
                      {automation.last_execution && (
                        <div className="flex gap-2 pt-3 border-t border-cream-300" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            className={`flex-1 text-white ${
                              automation.last_execution.session_id 
                                ? 'bg-navy hover:bg-navy-700' 
                                : automation.last_execution.status === 'failed'
                                  ? 'bg-red-600 hover:bg-red-700'
                                  : automation.last_execution.status === 'running' || automation.last_execution.status === 'pending'
                                    ? 'bg-gold-600 hover:bg-gold-700'
                                    : 'bg-steel hover:bg-steel-700'
                            }`}
                            onClick={() => handleViewLastExecution(automation)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            {automation.last_execution.session_id 
                              ? 'Voir Résultats' 
                              : automation.last_execution.status === 'failed'
                                ? 'Voir Erreur'
                                : automation.last_execution.status === 'running' || automation.last_execution.status === 'pending'
                                  ? 'En cours...'
                                  : 'Voir Détails'
                            }
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 bg-gradient-to-r from-steel-600 to-gold-600 hover:from-steel-700 hover:to-gold-700 text-white disabled:opacity-50"
                            onClick={() => handleLaunchAIAnalysis(automation)}
                            disabled={!automation.last_execution.session_id}
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Analyse IA
                          </Button>
                        </div>
                      )}

                      {/* Actions Principales */}
                      <div className="flex gap-2 pt-3 border-t border-cream-300" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          className={automation.is_active && !automation.is_paused ? 
                            "flex-1 bg-gold-600 hover:bg-gold-700 text-white" : 
                            "flex-1 bg-green-600 hover:bg-green-700 text-white"}
                          onClick={() => handleToggleAutomation(automation.id, automation.is_active)}
                        >
                          {automation.is_active && !automation.is_paused ? (
                            <>
                              <Pause className="w-4 h-4 mr-2" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Activer
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          className="bg-gold hover:bg-gold-600 text-white"
                          onClick={() => handleTriggerManually(automation.id)}
                          disabled={triggeringIds.has(automation.id)}
                        >
                          {triggeringIds.has(automation.id) ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Lancement...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-2" />
                              Lancer
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => handleDeleteAutomation(automation.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateAutomationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchAutomations();
            refreshBalance();
          }}
        />
      )}
    </div>
  );
};

export default AutomationsPage;
