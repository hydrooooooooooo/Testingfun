import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
import {
  Eye, EyeOff, Mail, Lock, ArrowRight,
  Globe, Database, FileJson, Cpu, AlertCircle
} from 'lucide-react';
import api from '@/services/api';

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
  const [showPassword, setShowPassword] = useState(false);

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

  const endpoints = [
    { icon: Globe, label: 'API Base URL', value: 'https://easyscrapy.com/api' },
    { icon: Database, label: 'Facebook Scraping', value: 'Apify Actor — Pages & Posts' },
    { icon: FileJson, label: 'Formats d\'export', value: 'CSV, Excel, JSON, PDF' },
    { icon: Cpu, label: 'Analyses IA', value: 'OpenRouter — Multi-modèles' },
  ];

  return (
    <div className="flex min-h-[calc(100vh-80px)] w-full">
      {/* ─── LEFT FORM PANEL ─── */}
      <div className="flex-1 flex flex-col bg-cream-50">
        {/* Mobile branding header */}
        <div className="lg:hidden bg-navy px-6 py-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gold/10 rounded-full blur-3xl" />
          <div className="relative z-10 text-center">
            <h1 className="font-display text-white text-xl font-bold">
              Connexion
            </h1>
            <p className="text-steel-200 text-sm mt-1">
              Retrouvez votre tableau de bord
            </p>
          </div>
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-8 sm:py-12">
          <div className="w-full max-w-md">
            {/* Desktop heading */}
            <div className="hidden lg:block mb-8">
              <h2 className="font-display text-navy text-2xl font-bold">
                Se connecter
              </h2>
              <p className="text-steel mt-1.5 text-sm">
                Saisissez vos identifiants pour accéder à votre espace
              </p>
            </div>

            {/* Unverified email warning */}
            {unverified && (
              <div className="mb-6 flex items-start gap-3 bg-gold/10 border border-gold/30 rounded-xl px-4 py-3.5">
                <AlertCircle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-navy text-sm font-semibold">E-mail non vérifié</p>
                  <p className="text-steel text-[13px] mt-0.5">
                    Veuillez consulter votre boîte de réception pour valider votre compte.
                  </p>
                  <Link
                    to="/resend-verification"
                    className="inline-block text-[13px] text-navy font-semibold hover:text-gold transition-colors mt-1.5"
                  >
                    Renvoyer l'e-mail de vérification
                  </Link>
                </div>
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-navy font-semibold text-[13px]">Adresse e-mail</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel" />
                          <Input
                            placeholder="nom@exemple.com"
                            className="pl-10 h-12 bg-white border-cream-300 focus:border-navy focus:ring-navy/20 text-[15px]"
                            {...field}
                          />
                        </div>
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
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-navy font-semibold text-[13px]">Mot de passe</FormLabel>
                        <Link
                          to="/forgot-password"
                          className="text-[12px] text-steel hover:text-navy transition-colors font-medium"
                        >
                          Mot de passe oublié ?
                        </Link>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel" />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Votre mot de passe"
                            className="pl-10 pr-10 h-12 bg-white border-cream-300 focus:border-navy focus:ring-navy/20 text-[15px]"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-steel hover:text-navy transition-colors"
                            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit */}
                <div className="pt-1">
                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="w-full h-12 bg-gold text-navy font-bold text-[15px] hover:bg-gold-300 transition-all shadow-md hover:shadow-lg rounded-xl"
                  >
                    {form.formState.isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin" />
                        Connexion en cours...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Se connecter
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </Form>

            {/* Register link */}
            <div className="mt-8 pt-6 border-t border-cream-300 text-center">
              <p className="text-sm text-steel">
                Vous n'avez pas de compte ?{' '}
                <Link
                  to="/register"
                  className="text-navy font-semibold hover:text-gold transition-colors"
                >
                  Créer un compte
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── RIGHT BRANDING PANEL (desktop only) ─── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] relative bg-navy overflow-hidden flex-col justify-between p-10 xl:p-14">
        {/* Decorative circles */}
        <div className="absolute top-16 -right-20 w-72 h-72 bg-gold/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-gold/8 rounded-full blur-2xl" />

        {/* Top content */}
        <div className="relative z-10">
          <h1 className="font-display text-white text-3xl xl:text-4xl font-bold leading-tight mb-4">
            Bon retour parmi
            <span className="block text-gold mt-1">nous</span>
          </h1>
          <p className="text-steel-200 text-base leading-relaxed max-w-md">
            Connectez-vous pour retrouver vos extractions, analyses et données en un clic.
          </p>
        </div>

        {/* Technical endpoints */}
        <div className="relative z-10 space-y-3">
          {endpoints.map((ep, i) => (
            <div
              key={i}
              className="flex items-start gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-3.5"
            >
              <div className="w-9 h-9 bg-gold/15 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <ep.icon className="w-[18px] h-[18px] text-gold" />
              </div>
              <div>
                <span className="text-steel-200 text-[11px] font-medium uppercase tracking-wider">{ep.label}</span>
                <p className="text-cream-200 text-sm font-mono mt-0.5">{ep.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom text */}
        <p className="relative z-10 text-steel-200 text-xs">
          Plateforme d'intelligence sociale &middot; Depuis Madagascar
        </p>
      </div>
    </div>
  );
}
