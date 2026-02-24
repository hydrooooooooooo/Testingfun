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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Brain, Building2, Check, Loader2, Lock, Settings, Sparkles, User, Users } from 'lucide-react';
import type { AIModel } from '@/types';
import { BUSINESS_SECTORS, COMPANY_SIZES } from '@/constants/userProfile';

const BASE_CREDIT_COST = 2; // crédits de base par analyse IA (1 page)

const SettingsTab: React.FC = () => {
  const { user, login, logout } = useAuth();
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [businessSector, setBusinessSector] = useState('');
  const [companySize, setCompanySize] = useState('');

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
      setBusinessSector(user.business_sector || '');
      setCompanySize(user.company_size || '');
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
      await api.put('/user/profile', { name, phone_number: phoneNumber, business_sector: businessSector || undefined, company_size: companySize || undefined });

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
    <div className="h-full bg-cream-50">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 pt-4">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy flex items-center gap-2">
            <Settings className="w-6 h-6 sm:w-7 sm:h-7 text-steel" />
            Paramètres
          </h1>
          <p className="text-steel mt-1">Gérez votre profil, sécurité et préférences IA</p>
        </div>

        {/* Row 1: Profile + Password */}
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          {/* Profile Card */}
          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-steel" />
                <CardTitle className="text-navy">Profil</CardTitle>
              </div>
              <CardDescription className="text-steel">
                Mettez à jour les informations de votre profil.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-navy">Email</Label>
                  <Input
                    id="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-cream-50 text-steel border-cream-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-navy">Nom</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border-cream-300 focus:border-gold"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-navy">Numéro de téléphone</Label>
                  <Input
                    id="phone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Ex: 0340012345"
                    className="border-cream-300 focus:border-gold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-navy flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-steel" />
                      Secteur d'activité
                    </Label>
                    <Select value={businessSector} onValueChange={setBusinessSector}>
                      <SelectTrigger className="border-cream-300 focus:border-gold">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {BUSINESS_SECTORS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-navy flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-steel" />
                      Taille entreprise
                    </Label>
                    <Select value={companySize} onValueChange={setCompanySize}>
                      <SelectTrigger className="border-cream-300 focus:border-gold">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPANY_SIZES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={profileLoading}
                  className="w-full sm:w-auto bg-navy hover:bg-navy/90 text-white"
                >
                  {profileLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Mise à jour...
                    </>
                  ) : (
                    'Mettre à jour le profil'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Password Card */}
          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-steel" />
                <CardTitle className="text-navy">Changer le mot de passe</CardTitle>
              </div>
              <CardDescription className="text-steel">
                Après la modification, vous serez déconnecté pour des raisons de sécurité.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handlePasswordChange}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password" className="text-navy">Mot de passe actuel</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="border-cream-300 focus:border-gold"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-navy">Nouveau mot de passe</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="border-cream-300 focus:border-gold"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-navy">Confirmer le nouveau mot de passe</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="border-cream-300 focus:border-gold"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full sm:w-auto bg-navy hover:bg-navy/90 text-white"
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Chargement...
                    </>
                  ) : (
                    'Changer le mot de passe'
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Row 2: AI Model Selector */}
        {models.length > 0 && (
          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-gold" />
                <CardTitle className="text-navy">Modèle IA préféré</CardTitle>
              </div>
              <CardDescription className="text-steel">
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
                          className={`relative flex flex-col items-start gap-1.5 rounded-lg border-2 p-3 sm:p-4 text-left transition-all ${
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
                          <span className="text-sm font-semibold text-navy pr-5">{model.name}</span>
                          <span className="text-xs text-steel">{model.provider}</span>
                          <span className="mt-1 text-xs leading-snug text-steel/80 hidden sm:block">{model.description}</span>
                          <div className="mt-auto pt-2 flex flex-wrap items-center gap-1.5">
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
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg bg-cream-50 border border-cream-300 px-4 py-3">
                    <span className="text-sm text-steel">
                      Coût estimé par analyse :{' '}
                      <span className="font-semibold text-navy">
                        {BASE_CREDIT_COST} cr. x {selectedModelData?.costMultiplier ?? 1} ={' '}
                        <span className="text-gold">{estimatedCost} crédits</span>
                      </span>
                    </span>
                    <Button
                      onClick={handleModelSave}
                      disabled={modelSaving || selectedModel === savedModel}
                      size="sm"
                      className="w-full sm:w-auto bg-gold hover:bg-gold/90 text-white"
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
    </div>
  );
};

export default SettingsTab;
