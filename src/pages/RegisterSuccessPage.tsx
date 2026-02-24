import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle, Clock } from 'lucide-react';

export default function RegisterSuccessPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleResendEmail = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setCountdown(60);
        setCanResend(false);
      }
    } catch (error) {
      console.error('Erreur lors du renvoi de l\'email:', error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-cream-100 dark:bg-navy">
      <Card className="mx-auto max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">Inscription réussie !</CardTitle>
          <CardDescription>
            Votre compte a été créé avec succès
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-navy-50 dark:bg-navy-950 p-4 border border-navy-200 dark:border-navy-800">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-navy dark:text-navy-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-navy dark:text-navy-100 mb-1">
                  Vérifiez votre adresse e-mail
                </h3>
                <p className="text-sm text-navy dark:text-navy-200 mb-2">
                  Un e-mail de vérification a été envoyé à :
                </p>
                <p className="text-sm font-mono font-semibold text-navy dark:text-navy-100 bg-white dark:bg-navy-900/50 px-2 py-1 rounded">
                  {email}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-steel dark:text-steel-200">
              <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
              <span>Consultez votre boîte de réception</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-steel dark:text-steel-200">
              <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
              <span>Cliquez sur le lien de vérification dans l'e-mail</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-steel dark:text-steel-200">
              <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
              <span>Connectez-vous avec vos identifiants</span>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-steel dark:text-steel-200 mb-3">
              Vous n'avez pas reçu l'e-mail ?
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={handleResendEmail}
                disabled={!canResend}
                className="w-full"
              >
                {canResend ? (
                  'Renvoyer l\'e-mail de vérification'
                ) : (
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Renvoyer dans {countdown}s
                  </span>
                )}
              </Button>
              <p className="text-xs text-steel dark:text-steel text-center">
                Vérifiez également votre dossier spam/courrier indésirable
              </p>
            </div>
          </div>

          <div className="pt-4">
            <Link to="/login" className="block">
              <Button variant="default" className="w-full">
                Aller à la page de connexion
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
