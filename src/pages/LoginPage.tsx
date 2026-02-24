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
  Eye, EyeOff, Mail, Lock, ArrowRight, AlertCircle
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

  const steps = [
    { num: '01', title: 'Créez votre compte', desc: 'Inscription gratuite en 30 secondes. Recevez des crédits d\'essai pour tester immédiatement.' },
    { num: '02', title: 'Lancez vos extractions', desc: 'Marketplace, Pages Facebook, publications, commentaires — collez vos URLs et laissez notre moteur travailler.' },
    { num: '03', title: 'Analysez avec l\'IA', desc: 'Notre IA décrypte vos données : tendances, benchmark concurrentiel, recommandations stratégiques personnalisées.' },
    { num: '04', title: 'Exploitez vos résultats', desc: 'Exportez en Excel, programmez des extractions récurrentes et recevez des alertes de mentions automatiques.' },
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
        {/* Decorative accents */}
        <div className="absolute top-16 -right-20 w-72 h-72 bg-gold/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />

        {/* Header */}
        <div className="relative z-10">
          <p className="text-gold text-[11px] font-semibold uppercase tracking-[0.2em] mb-3">Comment ça marche ?</p>
          <h1 className="font-display text-white text-2xl xl:text-[28px] font-bold leading-snug">
            De la collecte brute à l'insight
            <span className="block text-gold mt-0.5">stratégique en 4 étapes.</span>
          </h1>
        </div>

        {/* Vertical timeline steps */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-6">
          <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gradient-to-b from-gold/40 via-gold/20 to-gold/5" />

            <div className="space-y-6">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-5 group">
                  {/* Number dot */}
                  <div className="relative flex-shrink-0">
                    <div className="w-[31px] h-[31px] rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
                      <span className="text-gold text-[11px] font-bold font-mono">{step.num}</span>
                    </div>
                  </div>
                  {/* Content */}
                  <div className="pt-0.5">
                    <h3 className="text-white text-[15px] font-semibold leading-tight">{step.title}</h3>
                    <p className="text-steel-200 text-[13px] leading-relaxed mt-1.5 max-w-xs">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <p className="relative z-10 text-steel-200 text-xs">
          Plateforme d'intelligence sociale &middot; Depuis Madagascar
        </p>
      </div>
    </div>
  );
}
