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
  Eye, EyeOff, ArrowRight, Check, User, Mail, Phone, Lock
} from 'lucide-react';
import api from '@/services/api';
import SEOHead from '@/components/seo/SEOHead';

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

  const steps = [
    { num: '01', title: 'Créez votre compte', desc: 'Inscription gratuite en 30 secondes. Recevez des crédits d\'essai pour tester immédiatement.' },
    { num: '02', title: 'Lancez vos analyses', desc: 'Marketplace, Pages Facebook, publications, commentaires — collez vos URLs et laissez la plateforme travailler.' },
    { num: '03', title: 'Analysez avec l\'IA', desc: 'Notre IA décrypte vos données : tendances, benchmark concurrentiel, recommandations stratégiques personnalisées.' },
    { num: '04', title: 'Exploitez vos résultats', desc: 'Exportez en Excel, programmez des collectes récurrentes et recevez des alertes de mentions automatiques.' },
  ];

  return (
    <div className="flex min-h-[calc(100vh-80px)] w-full">
      <SEOHead title="Inscription" description="Creez votre compte Easy gratuitement." path="/register" noindex />
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
          Inscription gratuite &middot; Crédits d'essai inclus &middot; Sans engagement
        </p>
      </div>
    </div>
  );
}
