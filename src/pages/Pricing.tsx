import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import PricingPlan from "@/components/PricingPlan";
import PricingFeatures from "@/components/PricingFeatures";
import { PLANS } from "@/lib/plans";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, Star } from "lucide-react";
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

// Fonction pour formater les features de manière plus claire
const formatPlanFeatures = (plan: Pack): string[] => {
  const baseFeatures = [
    `${plan.nbDownloads.toLocaleString()} extractions complètes`,
    "Données en temps réel",
    "Export JSON/CSV",
  ];

  if (plan.nbDownloads <= 50) {
    return [
      ...baseFeatures,
      "Crédits sans expiration",
      "Idéal pour débuter",
    ];
  } else if (plan.nbDownloads <= 150) {
    return [
      ...baseFeatures,
      "Économisez 47%",
      "Notre pack le plus populaire",
      "Support prioritaire",
    ];
  } else if (plan.nbDownloads <= 350) {
    return [
      ...baseFeatures,
      "Économies substantielles",
      "Parfait pour projets récurrents",
      "API premium incluse",
    ];
  } else if (plan.nbDownloads <= 700) {
    return [
      ...baseFeatures,
      "Volume professionnel",
      "Économies maximales",
      "Support dédié 24/7",
    ];
  } else {
    return [
      ...baseFeatures,
      "Meilleur rapport qualité/prix",
      "Crédits permanents",
      "Support entreprise",
      "API illimitée",
    ];
  }
};

// Convertir les plans API en plans d'affichage pour le composant PricingPlan
const PRICING_PLANS: PricingPlanDisplay[] = PLANS.map(plan => ({
  name: plan.name,
  price: plan.priceLabel,
  desc: `${plan.nbDownloads.toLocaleString()} téléchargements`,
  features: formatPlanFeatures(plan),
  cta: plan.popular ? "Le plus populaire" : "Choisir ce pack",
  popular: plan.popular || false,
  packId: plan.id,
  nbDownloads: plan.nbDownloads,
}));

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
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
        <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          
          {/* Header Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
              <Star className="w-4 h-4" />
              Tarification Simple et Transparente
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent mb-6">
              Choisissez Votre Pack{" "}
              <span className="block mt-2">
                <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-lg text-3xl md:text-4xl lg:text-5xl">
                  easyscrapymg
                </span>
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Des crédits <strong className="text-blue-600">utilisables sans limite de temps</strong>.
              <br className="hidden sm:block" />
              Paiement unique et sécurisé, accès immédiat après paiement.
            </p>
          </div>

          {/* Features Section */}
          <div className="mb-16">
            <PricingFeatures />
          </div>

          {/* Pricing Plans Grid */}
          <div className="mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-8">
              Nos Offres
            </h2>
            
            {/* Grid responsive optimisé */}
            <div className="grid gap-6 lg:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 justify-items-center items-stretch max-w-6xl mx-auto">
              {PRICING_PLANS.map((plan, i) => (
                <div
                  key={i}
                  className={`w-full max-w-sm ${
                    plan.popular 
                      ? 'transform scale-105 z-10' 
                      : ''
                  }`}
                >
                  <PricingPlan 
                    plan={plan} 
                    onClickPay={handlePay}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="text-center space-y-4">
            <div className="flex flex-wrap justify-center items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Paiement sécurisé par Stripe</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Accès immédiat</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Aucun abonnement</span>
              </div>
            </div>
            
            <p className="text-xs text-gray-400 italic max-w-md mx-auto">
              Crédits activés instantanément après paiement. 
              Aucun engagement, aucune facturation récurrente.
            </p>
          </div>

          {/* FAQ Section Placeholder */}
          <div className="mt-20 text-center">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-2xl mx-auto">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Une question ?
              </h3>
              <p className="text-gray-600 mb-4">
                Notre équipe est là pour vous aider à choisir le pack adapté à vos besoins.
              </p>
              <div className="text-sm text-blue-600 font-medium">
                Contactez-nous pour plus d'informations
              </div>
            </div>
          </div>

        </section>
      </div>
    </Layout>
  );
}