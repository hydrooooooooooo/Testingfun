import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, DollarSign, Calendar, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import api from '@/services/api';
import { useCredits } from '@/hooks/useCredits';

interface CreateAutomationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateAutomationModal: React.FC<CreateAutomationModalProps> = ({ onClose, onSuccess }) => {
  const { balance } = useCredits();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scrapeType, setScrapeType] = useState<'marketplace' | 'facebook_pages' | 'posts_comments'>('posts_comments');
  const [targetUrl, setTargetUrl] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  
  // Config options
  const [maxItems, setMaxItems] = useState(50);
  const [includeComments, setIncludeComments] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(false);
  const [benchmark, setBenchmark] = useState(false);
  const [mentionDetection, setMentionDetection] = useState(false);
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [customEmail, setCustomEmail] = useState('');
  const [alertOnPriceChange, setAlertOnPriceChange] = useState(false);
  const [alertOnNewMention, setAlertOnNewMention] = useState(false);
  const [alertOnError, setAlertOnError] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);

  // Cost calculation
  const baseCost = 1;
  const aiCost = aiAnalysis ? 5 : 0;
  const benchmarkCost = benchmark ? 2 : 0;
  const mentionCost = mentionDetection ? 1 : 0;
  const costPerRun = baseCost + aiCost + benchmarkCost + mentionCost;
  
  const runsPerMonth = frequency === 'daily' ? 30 : frequency === 'weekly' ? 4 : 1;
  const monthlyCost = costPerRun * runsPerMonth;

  const hasEnoughCredits = balance ? balance.total >= costPerRun : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !targetUrl) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs requis',
        variant: 'destructive',
      });
      return;
    }

    if (!hasEnoughCredits) {
      toast({
        title: 'Crédits insuffisants',
        description: `Vous avez besoin de ${costPerRun} crédits pour la première exécution`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      await api.post('/automations', {
        name,
        description,
        scrape_type: scrapeType,
        target_url: targetUrl,
        frequency,
        config: {
          maxItems,
          includeComments,
          aiAnalysis,
          benchmark,
          mentionDetection,
        },
        notification_settings: {
          email: emailNotifications,
          emailAddress: customEmail || null,
          alertOnPriceChange,
          alertOnNewMention,
          alertOnError,
          weeklyReport,
        },
        credits_per_run: costPerRun,
      });

      toast({
        title: 'Succès',
        description: 'Automatisation créée avec succès',
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.message || 'Erreur lors de la création',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border-cream-300">
        <DialogHeader>
          <DialogTitle className="text-2xl text-navy">Nouvelle Automatisation</DialogTitle>
          <DialogDescription className="text-steel">
            Configurez une surveillance automatique de page ou concurrent
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-navy-700">Nom de l'automatisation *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Surveillance Concurrent Nike"
                className="bg-white border-cream-300 text-navy mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-navy-700">Description (optionnel)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description de cette automatisation..."
                className="bg-white border-cream-300 text-navy mt-1"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scrapeType" className="text-navy-700">Type de scraping *</Label>
                <Select value={scrapeType} onValueChange={(v: any) => setScrapeType(v)}>
                  <SelectTrigger className="bg-white border-cream-300 text-navy mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-cream-300">
                    <SelectItem value="posts_comments">
                      <div className="flex items-center gap-2">
                        <span>Posts & Commentaires</span>
                        <span className="text-xs text-green-400">(Recommandé)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="facebook_pages">Facebook Pages</SelectItem>
                    <SelectItem value="marketplace">Marketplace</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-steel mt-1">
                  {scrapeType === 'posts_comments' && 'Surveiller les posts et commentaires d\'une page'}
                  {scrapeType === 'facebook_pages' && 'Analyser les métriques d\'une page Facebook'}
                  {scrapeType === 'marketplace' && 'Surveiller les produits du Marketplace'}
                </p>
              </div>

              <div>
                <Label htmlFor="frequency" className="text-navy-700">Fréquence *</Label>
                <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
                  <SelectTrigger className="bg-white border-cream-300 text-navy mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-cream-300">
                    <SelectItem value="daily">Quotidien</SelectItem>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="targetUrl" className="text-navy-700">URL à surveiller *</Label>
              <Input
                id="targetUrl"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://facebook.com/marketplace/..."
                className="bg-white border-cream-300 text-navy mt-1"
                required
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-navy">Options de scraping</h3>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="aiAnalysis"
                checked={aiAnalysis}
                onCheckedChange={(checked) => setAiAnalysis(checked as boolean)}
                className="border-steel"
              />
              <Label htmlFor="aiAnalysis" className="text-navy-700 cursor-pointer flex items-center gap-2">
                Analyse IA
                <Badge variant="outline" className="bg-steel-100 border-steel-300 text-steel-600">
                  +5 crédits
                </Badge>
              </Label>
            </div>

            {(scrapeType === 'facebook_pages' || scrapeType === 'posts_comments') && (
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="benchmark"
                    checked={benchmark}
                    onCheckedChange={(checked) => setBenchmark(checked as boolean)}
                    className="border-steel"
                  />
                  <Label htmlFor="benchmark" className="text-navy-700 cursor-pointer flex items-center gap-2">
                    Benchmark concurrent
                    <Badge variant="outline" className="bg-navy-100 border-navy-300 text-navy">
                      +2 crédits
                    </Badge>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mentionDetection"
                    checked={mentionDetection}
                    onCheckedChange={(checked) => setMentionDetection(checked as boolean)}
                    className="border-steel"
                  />
                  <Label htmlFor="mentionDetection" className="text-navy-700 cursor-pointer flex items-center gap-2">
                    Détection de mentions
                    <Badge variant="outline" className="bg-gold-100 border-gold-300 text-gold-600">
                      +1 crédit
                    </Badge>
                  </Label>
                </div>
              </>
            )}
          </div>

          {/* Notifications */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-navy">Notifications</h3>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="emailNotifications"
                checked={emailNotifications}
                onCheckedChange={(checked) => setEmailNotifications(checked as boolean)}
                className="border-steel"
              />
              <Label htmlFor="emailNotifications" className="text-navy-700 cursor-pointer">
                Recevoir un email après chaque exécution
              </Label>
            </div>

            {emailNotifications && (
              <div className="ml-6">
                <Label htmlFor="customEmail" className="text-navy-700 text-sm">
                  Email personnalisé (optionnel)
                </Label>
                <Input
                  id="customEmail"
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="Laisser vide pour utiliser votre email principal"
                  className="bg-white border-cream-300 text-navy mt-1"
                />
              </div>
            )}

            {scrapeType === 'marketplace' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="alertOnPriceChange"
                  checked={alertOnPriceChange}
                  onCheckedChange={(checked) => setAlertOnPriceChange(checked as boolean)}
                  className="border-steel"
                />
                <Label htmlFor="alertOnPriceChange" className="text-navy-700 cursor-pointer">
                  Alertes changements de prix
                </Label>
              </div>
            )}

            {(scrapeType === 'facebook_pages' || scrapeType === 'posts_comments') && mentionDetection && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="alertOnNewMention"
                  checked={alertOnNewMention}
                  onCheckedChange={(checked) => setAlertOnNewMention(checked as boolean)}
                  className="border-steel"
                />
                <Label htmlFor="alertOnNewMention" className="text-navy-700 cursor-pointer">
                  Alertes nouvelles mentions
                </Label>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="alertOnError"
                checked={alertOnError}
                onCheckedChange={(checked) => setAlertOnError(checked as boolean)}
                className="border-steel"
              />
              <Label htmlFor="alertOnError" className="text-navy-700 cursor-pointer">
                Alertes en cas d'erreur
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="weeklyReport"
                checked={weeklyReport}
                onCheckedChange={(checked) => setWeeklyReport(checked as boolean)}
                className="border-steel"
              />
              <Label htmlFor="weeklyReport" className="text-navy-700 cursor-pointer">
                Rapport hebdomadaire
              </Label>
            </div>
          </div>

          {/* Cost Summary */}
          <Card className="bg-gradient-to-r from-gold-50 to-steel-50 border-gold-200">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-steel-400" />
                    <span className="text-navy-700 font-medium">Coût par exécution</span>
                  </div>
                  <div className="text-2xl font-bold text-steel-400">{costPerRun} crédits</div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-navy" />
                    <span className="text-steel">Coût mensuel estimé</span>
                  </div>
                  <div className="text-lg font-semibold text-navy">{monthlyCost} crédits</div>
                </div>

                <div className="flex items-center justify-between text-sm pt-2 border-t border-cream-300">
                  <span className="text-steel">Votre solde actuel</span>
                  <div className={`text-lg font-semibold ${hasEnoughCredits ? 'text-green-400' : 'text-red-400'}`}>
                    {balance?.total || 0} crédits
                  </div>
                </div>

                {!hasEnoughCredits && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mt-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-600">
                      Crédits insuffisants pour la première exécution. Rechargez votre compte avant de créer cette automatisation.
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1 border-cream-300 text-navy-700 hover:bg-cream-100"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading || !hasEnoughCredits}
              className="flex-1 bg-steel-600 hover:bg-steel-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Créer l'automatisation
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAutomationModal;
