import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

// Schéma de validation pour le formulaire de connexion
const formSchema = z.object({
  email: z.string().email({ message: 'Veuillez saisir une adresse e-mail valide.' }),
  password: z.string().min(1, { message: 'Le mot de passe est requis.' }),
});

export default function LoginPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [unverified, setUnverified] = useState(false);
  const [lastEmail, setLastEmail] = useState<string>('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setUnverified(false);
      setLastEmail(values.email);
      const { data } = await api.post('/auth/login', values);

      // Store user info in context (auth is via httpOnly cookie)
      login(data.user);

      toast({
        title: 'Connexion réussie',
        description: 'Vous allez être redirigé vers votre tableau de bord.',
      });

      navigate('/dashboard');

    } catch (error: any) {
      if (error?.response?.status === 403) {
        setUnverified(true);
      }
      const errorMessage = error?.response?.data?.message || (error instanceof Error ? error.message : 'Une erreur inconnue est survenue.');
      toast({
        variant: 'destructive',
        title: 'Erreur de connexion',
        description: errorMessage,
      });
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-cream-100 dark:bg-navy">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Connexion</CardTitle>
          <CardDescription>
            Saisissez votre e-mail ci-dessous pour vous connecter à votre compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="nom@exemple.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Connexion en cours...' : 'Se connecter'}
                </Button>
                {unverified && (
                  <div className="text-center text-sm text-gold dark:text-gold-400">
                    Votre e-mail n’est pas vérifié. Veuillez consulter votre boîte de réception pour valider votre compte.
                  </div>
                )}
                <div className="text-center">
                  <Link to="/forgot-password" className="text-sm underline">
                    Mot de passe oublié ?
                  </Link>
                </div>
              </div>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Vous n'avez pas de compte ?{' '}
            <Link to="/register" className="underline">
              S'inscrire
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

