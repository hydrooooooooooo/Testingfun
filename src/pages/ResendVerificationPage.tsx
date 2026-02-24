import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Mail, ArrowRight, ArrowLeft, ShoppingBag, TrendingUp,
  Sparkles, Shield, MailCheck, Timer
} from 'lucide-react';
import api from '@/services/api';

const formSchema = z.object({
  email: z.string().email({ message: 'Veuillez saisir une adresse e-mail valide.' }),
});

export default function ResendVerificationPage() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  });

  // 2-minute cooldown management
  const COOLDOWN_MS = 2 * 60 * 1000;
  const STORAGE_KEY = 'resend_verification_cooldown_ts';
  const [now, setNow] = useState(Date.now());

  const expiresAt = useMemo(() => {
    const ts = Number(localStorage.getItem(STORAGE_KEY) || '0');
    return ts || 0;
  }, []);
  const [expiry, setExpiry] = useState<number>(expiresAt);

  const remainingMs = Math.max(0, (expiry || 0) - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const isCoolingDown = remainingMs > 0;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await api.post('/auth/request-password-reset', { email: values.email });
      toast({
        title: 'E-mail envoyé',
        description:
          "Si votre compte n'est pas vérifié, un e-mail de vérification vient de vous être renvoyé.",
      });
      form.reset();

      const newExpiry = Date.now() + COOLDOWN_MS;
      localStorage.setItem(STORAGE_KEY, String(newExpiry));
      setExpiry(newExpiry);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Une erreur est survenue. Réessayez plus tard.';
      toast({ variant: 'destructive', title: 'Erreur', description: message });
    }
  };

  const benefits = [
    { icon: ShoppingBag, text: 'Extraction Marketplace en 3 min' },
    { icon: TrendingUp, text: 'Benchmark concurrentiel automatisé' },
    { icon: Sparkles, text: 'Analyses IA de vos données' },
    { icon: Shield, text: 'Données sécurisées, jamais stockées' },
  ];

  return (
    <div className="flex min-h-[calc(100vh-80px)] w-full">
      {/* ─── LEFT BRANDING PANEL (desktop only) ─── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] relative bg-navy overflow-hidden flex-col justify-between p-10 xl:p-14">
        {/* Decorative circles */}
        <div className="absolute top-16 -left-20 w-72 h-72 bg-gold/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-gold/8 rounded-full blur-2xl" />

        {/* Top content */}
        <div className="relative z-10">
          <Link to="/" className="inline-block mb-14">
            <span className="text-white text-2xl font-bold font-display">
              EASY<span className="text-gold">SCRAPY</span>
              <span className="text-gold">.COM</span>
            </span>
          </Link>

          <h1 className="font-display text-white text-3xl xl:text-4xl font-bold leading-tight mb-4">
            Un dernier pas avant
            <span className="block text-gold mt-1">de commencer</span>
          </h1>
          <p className="text-steel-200 text-base leading-relaxed max-w-md">
            La vérification de votre e-mail protège votre compte et vos données. Renvoyez le lien si nécessaire.
          </p>
        </div>

        {/* Benefits list */}
        <div className="relative z-10 space-y-4">
          {benefits.map((b, i) => (
            <div
              key={i}
              className="flex items-center gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-3.5"
            >
              <div className="w-9 h-9 bg-gold/15 rounded-lg flex items-center justify-center flex-shrink-0">
                <b.icon className="w-[18px] h-[18px] text-gold" />
              </div>
              <span className="text-cream-200 text-sm font-medium">{b.text}</span>
            </div>
          ))}
        </div>

        {/* Bottom text */}
        <p className="relative z-10 text-steel-200 text-xs">
          Plateforme d'intelligence sociale &middot; Depuis Madagascar
        </p>
      </div>

      {/* ─── RIGHT FORM PANEL ─── */}
      <div className="flex-1 flex flex-col bg-cream-50">
        {/* Mobile branding header */}
        <div className="lg:hidden bg-navy px-6 py-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gold/10 rounded-full blur-3xl" />
          <div className="relative z-10 text-center">
            <Link to="/" className="inline-block mb-3">
              <span className="text-white text-xl font-bold font-display">
                EASY<span className="text-gold">SCRAPY</span>
                <span className="text-gold">.COM</span>
              </span>
            </Link>
            <h1 className="font-display text-white text-xl font-bold">
              Vérification e-mail
            </h1>
            <p className="text-steel-200 text-sm mt-1">
              Renvoyez le lien de vérification
            </p>
          </div>
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-8 sm:py-12">
          <div className="w-full max-w-md">
            {/* Desktop heading */}
            <div className="hidden lg:block mb-8">
              <div className="w-12 h-12 bg-gold/15 rounded-xl flex items-center justify-center mb-5">
                <MailCheck className="w-6 h-6 text-gold" />
              </div>
              <h2 className="font-display text-navy text-2xl font-bold">
                Renvoyer l'e-mail de vérification
              </h2>
              <p className="text-steel mt-1.5 text-sm">
                Entrez votre adresse e-mail pour recevoir un nouveau lien de vérification.
              </p>
            </div>

            {/* Mobile description */}
            <div className="lg:hidden mb-6">
              <p className="text-steel text-sm">
                Entrez votre adresse e-mail pour recevoir un nouveau lien de vérification.
              </p>
            </div>

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
                            type="email"
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

                {/* Cooldown indicator */}
                {isCoolingDown && (
                  <div className="flex items-center gap-3 bg-gold/10 border border-gold/30 rounded-xl px-4 py-3">
                    <Timer className="w-4 h-4 text-gold flex-shrink-0" />
                    <p className="text-navy text-[13px]">
                      Vous pourrez renvoyer un e-mail dans <span className="font-bold">{remainingSec}s</span>
                    </p>
                  </div>
                )}

                <div className="pt-1">
                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting || isCoolingDown}
                    className="w-full h-12 bg-gold text-navy font-bold text-[15px] hover:bg-gold-300 transition-all shadow-md hover:shadow-lg rounded-xl disabled:opacity-50"
                  >
                    {form.formState.isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin" />
                        Envoi en cours...
                      </span>
                    ) : isCoolingDown ? (
                      <span className="flex items-center gap-2">
                        <Timer className="w-4 h-4" />
                        Patientez {remainingSec}s
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Renvoyer le lien
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </Form>

            {/* Back to login */}
            <div className="mt-8 pt-6 border-t border-cream-300 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-steel hover:text-navy transition-colors font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour à la connexion
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
