import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import api from '../services/api';

const ProfilePage: React.FC = () => {
  const { user, login } = useAuth();
  const { toast } = useToast();

  const [profileData, setProfileData] = useState({ name: '', email: '', phone_number: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '' });

  useEffect(() => {
    if (user) {
      setProfileData({ name: user.name || '', email: user.email, phone_number: user.phone_number || '' });
    }
  }, [user]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/user/profile', profileData);
      // Refresh user info from the cookie-authenticated endpoint
      const meResponse = await api.get('/auth/me');
      if (meResponse.data?.user) {
        login(meResponse.data.user);
      }
      toast({ title: 'Succès', description: 'Votre profil a été mis à jour.' });
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.response?.data?.message || 'Une erreur est survenue.', variant: 'destructive' });
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/user/change-password', passwordData);
      toast({ title: 'Succès', description: 'Votre mot de passe a été changé.' });
      setPasswordData({ currentPassword: '', newPassword: '' });
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.response?.data?.message || 'Une erreur est survenue.', variant: 'destructive' });
    }
  };

  if (!user) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informations du profil</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label htmlFor="name">Nom</label>
              <Input id="name" name="name" value={profileData.name} onChange={handleProfileChange} />
            </div>
            <div>
              <label htmlFor="email">Email</label>
              <Input id="email" name="email" type="email" value={profileData.email} onChange={handleProfileChange} />
            </div>
            <div>
              <label htmlFor="phone_number">Numéro de téléphone</label>
              <Input id="phone_number" name="phone_number" value={profileData.phone_number} onChange={handleProfileChange} />
            </div>
            <Button type="submit">Mettre à jour le profil</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Changer le mot de passe</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="currentPassword">Mot de passe actuel</label>
              <Input id="currentPassword" name="currentPassword" type="password" value={passwordData.currentPassword} onChange={handlePasswordChange} />
            </div>
            <div>
              <label htmlFor="newPassword">Nouveau mot de passe</label>
              <Input id="newPassword" name="newPassword" type="password" value={passwordData.newPassword} onChange={handlePasswordChange} />
            </div>
            <Button type="submit">Changer le mot de passe</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
