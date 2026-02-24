import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Brain, Check, Loader2, Sparkles } from 'lucide-react';
import type { AIModel } from '@/types';

const BASE_CREDIT_COST = 2; // crédits de base par analyse IA (1 page)

const SettingsTab: React.FC = () => {
  const { user, login, logout } = useAuth();
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // AI Model state
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [savedModel, setSavedModel] = useState<string>('');
  const [modelLoading, setModelLoading] = useState(false);
  const [modelSaving, setModelSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhoneNumber(user.phone_number || '');
    }
  }, [user]);

  // Load AI models and user preference on mount
  useEffect(() => {
    const loadModels = async () => {
      setModelLoading(true);
      try {
        const [modelsRes, prefRes] = await Promise.all([
          api.get('/user/models'),
          api.get('/user/preferred-model'),
        ]);
        setModels(modelsRes.data.models || []);
        const pref = prefRes.data.modelId || '';
        setSelectedModel(pref);
        setSavedModel(pref);
      } catch (err) {
        // Silent fail — models section just won't show
      } finally {
        setModelLoading(false);
      }
    };
    loadModels();
  }, []);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      await api.put('/user/profile', { name, phone_number: phoneNumber });

      // Refresh user info from the cookie-authenticated endpoint
      const meResponse = await api.get('/auth/me');
      if (meResponse.data?.user) login(meResponse.data.user);
      toast.success('Profil mis à jour avec succès !');

    } catch (err: any) {
      toast.error(err.message || 'Échec de la mise à jour du profil.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setPasswordLoading(true);
    try {
      await api.post('/user/change-password', { currentPassword, newPassword });

      toast.success('Mot de passe mis à jour avec succès ! Vous allez être déconnecté.');

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        logout();
      }, 2000);

    } catch (err: any) {
      toast.error(err.message || 'Échec de la mise à jour du mot de passe.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleModelSave = async () => {
    if (!selectedModel || selectedModel === savedModel) return;
    setModelSaving(true);
    try {
      await api.put('/user/preferred-model', { modelId: selectedModel });
      setSavedModel(selectedModel);
      toast.success('Modèle IA mis à jour !');
    } catch (err: any) {
      toast.error(err.message || 'Échec de la mise à jour du modèle.');
    } finally {
      setModelSaving(false);
    }
  };

  const selectedModelData = models.find(m => m.id === selectedModel);
  const estimatedCost = selectedModelData
    ? Math.ceil(BASE_CREDIT_COST * selectedModelData.costMultiplier * 100) / 100
    : BASE_CREDIT_COST;

  return (
    <div className="space-y-6 pt-6">
      {/* Row 1: Profile + Password */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profil</CardTitle>
            <CardDescription>Mettez à jour les informations de votre profil.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Numéro de téléphone</Label>
                <Input id="phone" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Ex: 0340012345" />
              </div>
              <Button type="submit" disabled={profileLoading}>
                {profileLoading ? 'Mise à jour...' : 'Mettre à jour le profil'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <form onSubmit={handlePasswordChange}>
          <Card>
            <CardHeader>
              <CardTitle>Changer le mot de passe</CardTitle>
              <CardDescription>
                Mettez à jour votre mot de passe ici. Après la modification, vous
                serez automatiquement déconnecté pour des raisons de sécurité.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Mot de passe actuel</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={passwordLoading}>
                {passwordLoading ? 'Chargement...' : 'Changer le mot de passe'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>

      {/* Row 2: AI Model Selector (full width) */}
      {models.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-gold" />
              <CardTitle>Modèle IA préféré</CardTitle>
            </div>
            <CardDescription>
              Choisissez le modèle d'intelligence artificielle utilisé pour vos analyses et benchmarks.
              Le coût en crédits varie selon le modèle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {modelLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-steel" />
                <span className="ml-2 text-steel">Chargement des modèles...</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {models.map((model) => {
                    const isSelected = selectedModel === model.id;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => setSelectedModel(model.id)}
                        className={`relative flex flex-col items-start gap-1.5 rounded-lg border-2 p-4 text-left transition-all ${
                          isSelected
                            ? 'border-gold bg-gold/5 shadow-sm'
                            : 'border-cream-300 bg-white hover:border-steel/50'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute right-2 top-2">
                            <Check className="h-4 w-4 text-gold" />
                          </div>
                        )}
                        <span className="text-sm font-semibold text-navy">{model.name}</span>
                        <span className="text-xs text-steel">{model.provider}</span>
                        <span className="mt-1 text-xs leading-snug text-steel/80">{model.description}</span>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-bold text-gold">{model.costMultiplier}x</span>
                          {model.recommended && (
                            <Badge variant="outline" className="border-gold bg-gold/10 text-gold text-[10px] px-1.5 py-0">
                              <Sparkles className="mr-0.5 h-2.5 w-2.5" />
                              Recommandé
                            </Badge>
                          )}
                          {model.default && (
                            <Badge variant="outline" className="border-navy bg-navy/10 text-navy text-[10px] px-1.5 py-0">
                              Par défaut
                            </Badge>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Cost estimation */}
                <div className="flex items-center justify-between rounded-md bg-cream-50 px-4 py-3">
                  <span className="text-sm text-steel">
                    Coût estimé par analyse :{' '}
                    <span className="font-semibold text-navy">
                      {BASE_CREDIT_COST} cr. de base x {selectedModelData?.costMultiplier ?? 1} ={' '}
                      <span className="text-gold">{estimatedCost} crédits</span>
                    </span>
                  </span>
                  <Button
                    onClick={handleModelSave}
                    disabled={modelSaving || selectedModel === savedModel}
                    size="sm"
                  >
                    {modelSaving ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      'Enregistrer'
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SettingsTab;
