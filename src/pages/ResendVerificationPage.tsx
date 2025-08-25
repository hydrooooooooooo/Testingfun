import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
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
          "Si votre compte n’est pas vérifié, un e-mail de vérification vient de vous être renvoyé. Sinon, vous recevrez un lien de réinitialisation.",
      });
      form.reset();

      // Start cooldown window
      const newExpiry = Date.now() + COOLDOWN_MS;
      localStorage.setItem(STORAGE_KEY, String(newExpiry));
      setExpiry(newExpiry);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Une erreur est survenue. Réessayez plus tard.';
      toast({ variant: 'destructive', title: 'Erreur', description: message });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Renvoyer l’e-mail de vérification</CardTitle>
          <CardDescription>
            Entrez votre adresse e-mail pour recevoir un nouveau lien de vérification.
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
                      <Input type="email" placeholder="nom@exemple.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || isCoolingDown}>
                {form.formState.isSubmitting
                  ? 'Envoi en cours…'
                  : isCoolingDown
                    ? `Patientez ${remainingSec}s`
                    : 'Renvoyer'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

