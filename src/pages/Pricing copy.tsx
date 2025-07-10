import React, { useState, useEffect } from "react";

import PricingPlan from "@/components/PricingPlan";
import PricingFeatures from "@/components/PricingFeatures";
import { PLANS } from "@/lib/plans";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Pack } from "@/lib/plans";
import type { PricingPlanDisplay } from "@/components/PricingPlan";

// Configurer le lien de paiement fixe - Assurez-vous que ce lien est correct dans votre environnement
const FIXED_PAYMENT_LINK = import.meta.env.VITE_STRIPE_PAYMENT_LINK || "https://buy.stripe.com/test_8wg29z1Uy7Kk0Y88ww";

// Fonction pour générer un ID de session unique
const generateSessionId = () => {
  return `temp_${Math.random().toString(36).substring(2, 15)}`;
};

// Vérifier si l'environnement est en mode développement
const isDev = import.meta.env.MODE === 'development';

// Convertir les plans API en plans d'affichage pour le composant PricingPlan
const PRICING_PLANS: PricingPlanDisplay[] = PLANS.map(plan => ({
  name: `${plan.name} - ${plan.nbDownloads} téléchargements`,
  price: plan.priceLabel,
  desc: plan.description,
  features: [
    `${plan.nbDownloads} extractions complètes`,
    plan.nbDownloads <= 50 ? "Crédits valides sans limite de temps" : 
      plan.nbDownloads <= 150 ? "Économisez 47% par rapport au prix unitaire" :
      plan.nbDownloads <= 350 ? "Économies substantielles pour volume" :
      plan.nbDownloads <= 700 ? "Accès premium, gros volumes" :
      "Tarif au meilleur prix",
    plan.nbDownloads <= 50 ? "Test de service professionnel" :
      plan.nbDownloads <= 150 ? "Notre offre la plus populaire" :
      plan.nbDownloads <= 350 ? "Idéal projets récurrents" :
      plan.nbDownloads <= 700 ? "Économies maximales" :
      "Crédits permanents, sans expiration",
  ],
  cta: plan.popular ? "Populaire" : "Choisir ce pack",
  popular: plan.popular || false,
  packId: plan.id,
  nbDownloads: plan.nbDownloads,
}));

// Type pour les plans de tarification
type PricingPlan = {
  name: string;
  price: string;
  desc: string;
  features: string[];
  cta: string;
  popular?: boolean;
  stripeUrl?: string;
};

export default function PricingPage() {
  // États pour gérer le chargement et la session
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  
  // Générer un ID de session temporaire au chargement de la page
  useEffect(() => {
    // Générer un ID de session unique pour cette visite
    const tempSessionId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    setSessionId(tempSessionId);
    
    // Stocker l'ID de session dans le localStorage
    localStorage.setItem('currentSessionId', tempSessionId);
    
    console.log(`Session temporaire créée: ${tempSessionId}`);
  }, []);
  
  // Fonction pour gérer le paiement
  const handlePay = async (plan: PricingPlanDisplay) => {
    try {
      // Récupérer le packId directement depuis le plan d'affichage
      const packId = plan.packId;
      
      if (!packId) {
        toast({
          title: "Erreur de configuration",
          description: "Impossible de trouver l'identifiant du pack sélectionné.",
          variant: "destructive"
        });
        return;
      }
      
      setLoading(true);
      
      // Afficher un message de débogage en mode développement
      if (isDev) {
        console.log(`Session ID: ${sessionId}, Pack ID: ${packId}`);
        console.log(`Lien de paiement: ${FIXED_PAYMENT_LINK}`);
      }
      
      // Construire l'URL de paiement avec les paramètres
      const paymentUrl = `${FIXED_PAYMENT_LINK}?client_reference_id=${sessionId}&session_id=${sessionId}&pack_id=${packId}`;
      
      // Enregistrer le pack sélectionné et la session dans le localStorage
      localStorage.setItem('selectedPackId', packId);
      localStorage.setItem('currentSessionId', sessionId);
      
      // Afficher un toast de confirmation
      toast({
        title: "Redirection vers le paiement",
        description: "Vous allez être redirigé vers notre page de paiement sécurisé.",
      });
      
      // Attendre un court instant pour que le toast s'affiche
      setTimeout(() => {
        // Ouvrir le lien de paiement dans un nouvel onglet
        window.open(paymentUrl, "_blank");
        setLoading(false);
      }, 500);
      
    } catch (error) {
      console.error('Erreur lors de la préparation du paiement:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la préparation du paiement. Veuillez réessayer.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  return (

      <section className="mx-auto w-full max-w-5xl my-10 px-2 flex flex-col gap-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl shadow-sm p-6 md:p-9 flex flex-col items-center">
          <h1 className="text-4xl font-extrabold text-primary text-center mb-2">
            Tarifs{" "}
            <span className="bg-gradient-to-r from-blue-400 to-primary text-white px-2 rounded">
              easyscrapymg
            </span>
          </h1>
          <p className="text-lg text-muted-foreground text-center mb-0">
            Choisissez le pack adapté à vos besoins. Crédits <b>utilisables sans limite dans le temps</b>.<br />
            Paiement unique et sécurisé, téléchargement immédiat après paiement.
          </p>
        </div>
        <PricingFeatures />
        {/* Nouveau layout plus compact & responsive */}
        <div
          className="
            grid gap-7
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-3
            xl:grid-cols-5
            justify-items-center
            items-stretch
            mt-2
          "
        >
          {PRICING_PLANS.map((plan, i) => (
            <PricingPlan key={i} plan={plan} onClickPay={handlePay} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2 mb-0 italic">
          Crédit actif immédiatement. Aucun abonnement, aucun engagement.
        </p>
      </section>

  );
}
