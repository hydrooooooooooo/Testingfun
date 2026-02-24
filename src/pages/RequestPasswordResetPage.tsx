import { useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  Sparkles, Shield, CheckCircle, KeyRound
} from 'lucide-react';

const schema = z.object({
  email: z.string().email({ message: "Veuillez saisir une adresse e-mail valide." }),
});

export default function RequestPasswordResetPage() {
  const { toast } = useToast();
  const [sent, setSent] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Une erreur est survenue.');
      setSent(true);
      toast({ title: 'Email envoyé', description: "Si un compte existe pour cet e-mail, un lien de réinitialisation a été envoyé." });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Une erreur inconnue est survenue.';
      toast({ variant: 'destructive', title: 'Erreur', description: msg });
    }
  };

  const benefits = [
    { icon: ShoppingBag, text: 'Analyse Marketplace en 3 min' },
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
              Easy
              <span className="text-gold">.COM</span>
            </span>
          </Link>

          <h1 className="font-display text-white text-3xl xl:text-4xl font-bold leading-tight mb-4">
            Ça arrive aux
            <span className="block text-gold mt-1">meilleurs d'entre nous</span>
          </h1>
          <p className="text-steel-200 text-base leading-relaxed max-w-md">
            Pas de panique, nous allons vous aider à retrouver l'accès à votre compte en quelques instants.
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
                Easy
                <span className="text-gold">.COM</span>
              </span>
            </Link>
            <h1 className="font-display text-white text-xl font-bold">
              Mot de passe oublié
            </h1>
            <p className="text-steel-200 text-sm mt-1">
              Récupérez l'accès à votre compte
            </p>
          </div>
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-8 sm:py-12">
          <div className="w-full max-w-md">
            {sent ? (
              /* ─── Success state ─── */
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="font-display text-navy text-2xl font-bold mb-3">
                  E-mail envoyé
                </h2>
                <p className="text-steel text-sm leading-relaxed mb-2 max-w-sm mx-auto">
                  Si un compte est associé à cet e-mail, vous recevrez un lien de réinitialisation dans quelques instants.
                </p>
                <p className="text-steel text-[13px] mb-8">
                  Pensez à vérifier votre dossier spam.
                </p>

                <div className="space-y-3">
                  <Button
                    onClick={() => setSent(false)}
                    variant="outline"
                    className="w-full h-11 bg-transparent border-cream-300 text-navy font-semibold hover:bg-cream-200 rounded-xl"
                  >
                    Renvoyer avec une autre adresse
                  </Button>
                  <Link
                    to="/login"
                    className="flex items-center justify-center gap-2 w-full h-11 bg-gold text-navy font-bold hover:bg-gold-300 transition-all shadow-md rounded-xl text-[15px]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Retour à la connexion
                  </Link>
                </div>
              </div>
            ) : (
              /* ─── Form state ─── */
              <>
                {/* Desktop heading */}
                <div className="hidden lg:block mb-8">
                  <div className="w-12 h-12 bg-gold/15 rounded-xl flex items-center justify-center mb-5">
                    <KeyRound className="w-6 h-6 text-gold" />
                  </div>
                  <h2 className="font-display text-navy text-2xl font-bold">
                    Mot de passe oublié ?
                  </h2>
                  <p className="text-steel mt-1.5 text-sm">
                    Entrez votre adresse e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                  </p>
                </div>

                {/* Mobile heading (below branding header) */}
                <div className="lg:hidden mb-6">
                  <p className="text-steel text-sm">
                    Entrez votre adresse e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe.
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

                    <div className="pt-1">
                      <Button
                        type="submit"
                        disabled={form.formState.isSubmitting}
                        className="w-full h-12 bg-gold text-navy font-bold text-[15px] hover:bg-gold-300 transition-all shadow-md hover:shadow-lg rounded-xl"
                      >
                        {form.formState.isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin" />
                            Envoi en cours...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            Envoyer le lien
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
