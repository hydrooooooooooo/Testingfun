// src/pages/PaymentError.tsx
import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { PLANS } from "@/lib/plans";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, RefreshCw, Home, CreditCard, Mail, Info } from "lucide-react";
import { useApi } from "@/hooks/useApi";

interface PaymentErrorInfo {
  type: 'card_declined' | 'insufficient_funds' | 'expired_card' | 'incorrect_cvc' | 'processing_error' | 'network_error' | 'unknown';
  message: string;
  code?: string;
  retryable: boolean;
}

const getErrorInfo = (errorParam: string | null): PaymentErrorInfo => {
  const commonErrors: Record<string, PaymentErrorInfo> = {
    'card_declined': {
      type: 'card_declined',
      message: 'Votre carte a été refusée. Veuillez vérifier vos informations bancaires ou utiliser une autre carte.',
      retryable: true
    },
    'insufficient_funds': {
      type: 'insufficient_funds', 
      message: 'Fonds insuffisants sur votre carte. Veuillez utiliser une autre carte ou contacter votre banque.',
      retryable: true
    },
    'expired_card': {
      type: 'expired_card',
      message: 'Votre carte a expiré. Veuillez utiliser une carte valide.',
      retryable: true
    },
    'incorrect_cvc': {
      type: 'incorrect_cvc',
      message: 'Le code de sécurité (CVC) de votre carte est incorrect.',
      retryable: true
    },
    'processing_error': {
      type: 'processing_error',
      message: 'Une erreur temporaire s\'est produite lors du traitement de votre paiement.',
      retryable: true
    },
    'network_error': {
      type: 'network_error',
      message: 'Problème de connexion réseau. Veuillez réessayer.',
      retryable: true
    },
    'user_cancelled': {
      type: 'processing_error',
      message: 'Le paiement a été annulé. Vous pouvez réessayer quand vous voulez.',
      retryable: true
    }
  };

  if (errorParam && commonErrors[errorParam]) {
    return commonErrors[errorParam];
  }

  return {
    type: 'unknown',
    message: 'Une erreur inattendue s\'est produite lors du paiement.',
    retryable: true
  };
};

export default function PaymentErrorPage() {
  const location = useLocation();
  const search = new URLSearchParams(location.search);
  
  // Récupérer les paramètres de l'URL
  const sessionId = search.get("sessionId") || search.get("session_id");
  const packId = search.get("packId") || search.get("pack_id");
  const errorType = search.get("error");
  const errorCode = search.get("error_code");
  const stripeSessionId = search.get("stripe_session_id");
  
  const [pack, setPack] = useState(PLANS[0]);
  const [isRetrying, setIsRetrying] = useState(false);
  const [sessionValid, setSessionValid] = useState(false);
  
  const { createPayment } = useApi();
  
  // Trouver le pack correspondant
  useEffect(() => {
    if (packId) {
      const foundPack = PLANS.find(p => p.id === packId) || PLANS[0];
      setPack(foundPack);
    }
  }, [packId]);

  // Vérifier que la session existe encore
  useEffect(() => {
    const checkSession = async () => {
      if (!sessionId) return;
      
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/payment/verify-payment?sessionId=${sessionId}`);
        if (response.ok) {
          setSessionValid(true);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de la session:', error);
      }
    };

    checkSession();
  }, [sessionId]);

  const errorInfo = getErrorInfo(errorType);

  const handleRetryPayment = async () => {
    if (!sessionId || !packId) {
      toast({
        title: "Erreur",
        description: "Informations de session manquantes",
        variant: "destructive",
      });
      return;
    }

    setIsRetrying(true);
    
    try {
      const paymentUrl = await createPayment(sessionId, packId);
      
      if (paymentUrl) {
        // Rediriger vers Stripe Checkout
        window.location.href = paymentUrl;
      } else {
        throw new Error('URL de paiement non reçue');
      }
    } catch (error) {
      console.error('Erreur lors de la création du paiement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer une nouvelle session de paiement",
        variant: "destructive",
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const handleNewScraping = () => {
    window.location.href = '/';
  };

  return (

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* En-tête d'erreur */}
          <div className="text-center mb-8">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-navy mb-2">
              Échec du paiement
            </h1>
            <p className="text-lg text-steel">
              Votre paiement n'a pas pu être traité
            </p>
          </div>

          {/* Détails de l'erreur */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  Problème détecté
                </h3>
                <p className="text-red-800 mb-4">
                  {errorInfo.message}
                </p>
                
                {errorCode && (
                  <div className="text-sm text-red-700">
                    <strong>Code d'erreur :</strong> {errorCode}
                  </div>
                )}
                
                {stripeSessionId && (
                  <div className="text-sm text-red-700">
                    <strong>ID de session Stripe :</strong> {stripeSessionId}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Informations sur la commande */}
          {sessionValid && (
            <div className="bg-white rounded-lg border shadow-sm p-6 mb-8">
              <h2 className="text-xl font-semibold text-navy mb-4">Détails de votre commande</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-steel">Pack sélectionné</p>
                  <p className="font-semibold">{pack.name}</p>
                </div>
                <div>
                  <p className="text-sm text-steel">Prix</p>
                  <p className="font-semibold">{pack.priceLabel}</p>
                </div>
                <div>
                  <p className="text-sm text-steel">Nombre d'annonces</p>
                  <p className="font-semibold">{pack.nbDownloads} éléments</p>
                </div>
                <div>
                  <p className="text-sm text-steel">Session ID</p>
                  <p className="font-mono text-xs bg-cream-100 px-2 py-1 rounded">{sessionId}</p>
                </div>
              </div>
            </div>
          )}

          {/* Solutions et actions */}
          <div className="bg-navy-50 border border-navy-200 rounded-lg p-6 mb-8">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-navy mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-navy mb-3">
                  Solutions suggérées
                </h3>
                <ul className="text-navy space-y-2 mb-4">
                  <li>• Vérifiez que votre carte est valide et non expirée</li>
                  <li>• Assurez-vous d'avoir des fonds suffisants</li>
                  <li>• Vérifiez que les informations saisies sont correctes</li>
                  <li>• Essayez avec une autre carte bancaire</li>
                  <li>• Contactez votre banque si le problème persiste</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="space-y-4">
            {errorInfo.retryable && sessionValid && (
              <Button 
                onClick={handleRetryPayment}
                disabled={isRetrying}
                className="w-full bg-navy hover:bg-navy-400 text-white font-semibold py-3"
                size="lg"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Création du paiement...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Réessayer le paiement
                  </>
                )}
              </Button>
            )}
            
            <div className="grid md:grid-cols-2 gap-4">
              <Button 
                onClick={handleNewScraping}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Home className="h-4 w-4 mr-2" />
                Nouveau scraping
              </Button>
              
              <Link to="/support">
                <Button 
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contacter le support
                </Button>
              </Link>
            </div>
          </div>

          {/* Cartes de test pour le développement */}
          {import.meta.env.DEV && (
            <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-900 mb-3">
                🧪 Mode développement - Cartes de test
              </h3>
              <div className="text-yellow-800 space-y-2 text-sm">
                <div><strong>Carte réussie :</strong> <code>4242 4242 4242 4242</code></div>
                <div><strong>Carte refusée :</strong> <code>4000 0000 0000 0002</code></div>
                <div><strong>Fonds insuffisants :</strong> <code>4000 0000 0000 9995</code></div>
                <div><strong>Carte expirée :</strong> <code>4000 0000 0000 0069</code></div>
                <div><strong>CVC incorrect :</strong> <code>4000 0000 0000 0127</code></div>
                <div className="text-xs text-yellow-700 mt-2">
                  Date d'expiration : n'importe quelle date future | CVC : n'importe quel code 3 chiffres
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

  );
}