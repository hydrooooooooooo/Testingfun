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
import { toast } from 'sonner';

const SettingsTab: React.FC = () => {
  const { user, login, logout } = useAuth();
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhoneNumber(user.phone_number || '');
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const { data } = await api.put('/user/profile', { name, phone_number: phoneNumber });

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
      const { data } = await api.post('/user/change-password', { currentPassword, newPassword });

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

  return (
    <div className="grid gap-6 pt-6 md:grid-cols-2">
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
  );
};


export default SettingsTab;
