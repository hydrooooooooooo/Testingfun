import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import {
  Eye, EyeOff, Globe, Database, FileJson,
  Cpu, ArrowRight, Check, User, Mail, Phone, Lock
} from 'lucide-react';
import api from '@/services/api';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Le nom doit contenir au moins 2 caractères.' }),
  email: z.string().email({ message: 'Veuillez saisir une adresse e-mail valide.' }),
  password: z.string().min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' }),
  phone_number: z
    .string({ required_error: 'Le numéro de téléphone est requis.' })
    .trim()
    .min(7, { message: 'Numéro de téléphone invalide.' })
    .refine((val) => /^\+?\d{7,15}$/.test(val), {
      message: 'Numéro de téléphone invalide.',
    }),
  confirm_password: z.string({ required_error: 'La confirmation du mot de passe est requise.' })
}).refine((data) => data.password === data.confirm_password, {
  message: 'Les mots de passe ne correspondent pas.',
  path: ['confirm_password'],
});

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8 caractères min.', met: password.length >= 8 },
    { label: 'Une majuscule', met: /[A-Z]/.test(password) },
    { label: 'Un chiffre', met: /\d/.test(password) },
  ];
  const strength = checks.filter(c => c.met).length;

  if (!password) return null;

  return (
    <div className="space-y-2 pt-1">
      {/* Strength bar */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < strength
                ? strength === 1 ? 'bg-red-400' : strength === 2 ? 'bg-gold' : 'bg-emerald-500'
                : 'bg-cream-300'
            }`}
          />
        ))}
      </div>
      {/* Check list */}
      <div className="flex flex-wrap gap-x-4 gap-y-0.5">
        {checks.map(c => (
          <span
            key={c.label}
            className={`text-[11px] flex items-center gap-1 transition-colors ${
              c.met ? 'text-emerald-600' : 'text-steel'
            }`}
          >
            <Check className={`w-3 h-3 ${c.met ? 'opacity-100' : 'opacity-30'}`} />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phone_number: '',
      confirm_password: '',
    },
  });

  const watchPassword = form.watch('password');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await api.post('/auth/register', {
        name: values.name,
        email: values.email,
        password: values.password,
        phone_number: values.phone_number,
        confirm_password: values.confirm_password,
      });

      toast({
        title: 'Inscription réussie',
        description: "Un e-mail de vérification a été envoyé. Veuillez consulter votre boîte de réception.",
      });

      navigate('/login');

    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Une erreur inconnue est survenue.';
      toast({
        variant: 'destructive',
        title: "Erreur d'inscription",
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
              Créez votre compte
            </h1>
            <p className="text-steel-200 text-sm mt-1">
              Commencez gratuitement en quelques secondes
            </p>
          </div>
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-8 sm:py-12">
          <div className="w-full max-w-md">
            {/* Desktop heading */}
            <div className="hidden lg:block mb-8">
              <h2 className="font-display text-navy text-2xl font-bold">
                Créer un compte
              </h2>
              <p className="text-steel mt-1.5 text-sm">
                Remplissez les informations ci-dessous pour commencer
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Row: Name + Phone side by side on >=sm */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-navy font-semibold text-[13px]">Nom complet</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel" />
                            <Input
                              placeholder="Jean Rakoto"
                              className="pl-10 h-11 bg-white border-cream-300 focus:border-navy focus:ring-navy/20"
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
                    name="phone_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-navy font-semibold text-[13px]">Téléphone</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel" />
                            <Input
                              type="tel"
                              placeholder="+261 34 00 000 00"
                              className="pl-10 h-11 bg-white border-cream-300 focus:border-navy focus:ring-navy/20"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                            className="pl-10 h-11 bg-white border-cream-300 focus:border-navy focus:ring-navy/20"
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
                      <FormLabel className="text-navy font-semibold text-[13px]">Mot de passe</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel" />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Minimum 8 caractères"
                            className="pl-10 pr-10 h-11 bg-white border-cream-300 focus:border-navy focus:ring-navy/20"
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
                      <PasswordStrength password={watchPassword} />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirm_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-navy font-semibold text-[13px]">Confirmer le mot de passe</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel" />
                          <Input
                            type={showConfirm ? 'text' : 'password'}
                            placeholder="Retapez votre mot de passe"
                            className="pl-10 pr-10 h-11 bg-white border-cream-300 focus:border-navy focus:ring-navy/20"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirm((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-steel hover:text-navy transition-colors"
                            aria-label={showConfirm ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                          >
                            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="w-full h-12 bg-gold text-navy font-bold text-[15px] hover:bg-gold-300 transition-all shadow-md hover:shadow-lg rounded-xl"
                  >
                    {form.formState.isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin" />
                        Création du compte...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Créer mon compte
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </div>

                {/* Terms */}
                <p className="text-[11px] text-steel text-center leading-relaxed">
                  En créant un compte, vous acceptez nos{' '}
                  <a href="#" className="underline hover:text-navy transition-colors">
                    conditions d'utilisation
                  </a>{' '}
                  et notre{' '}
                  <a href="#" className="underline hover:text-navy transition-colors">
                    politique de confidentialité
                  </a>
                  .
                </p>
              </form>
            </Form>

            {/* Login link */}
            <div className="mt-6 pt-6 border-t border-cream-300 text-center">
              <p className="text-sm text-steel">
                Vous avez déjà un compte ?{' '}
                <Link
                  to="/login"
                  className="text-navy font-semibold hover:text-gold transition-colors"
                >
                  Se connecter
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
            Rejoignez la plateforme
            <span className="block text-gold mt-1">d'intelligence sociale</span>
          </h1>
          <p className="text-steel-200 text-base leading-relaxed max-w-md">
            Créez votre compte en quelques secondes et commencez à transformer les données Facebook en avantage concurrentiel.
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
          Inscription gratuite &middot; Crédits d'essai inclus &middot; Sans engagement
        </p>
      </div>
    </div>
  );
}
