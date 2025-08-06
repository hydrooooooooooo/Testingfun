import React, { useState } from "react";
import PaymentModal from "@/components/PaymentModal";

import PricingPlan from "@/components/PricingPlan";
import { PLANS } from "@/lib/plans";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, Star, Shield, Clock, Users, Smartphone, Mail, ArrowRight, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import type { Pack } from "@/lib/plans";
import type { PricingPlanDisplay } from "@/components/PricingPlan";

// Fonction pour générer un ID de session unique
const generateSessionId = () => {
  return `temp_${Math.random().toString(36).substring(2, 15)}`;
};

// Fonction pour formater les features de manière plus claire
const formatPlanFeatures = (plan: Pack): string[] => {
  const basePriceMGA = 500; // Prix unitaire de référence
  const unitPriceMGA = Math.round((plan.price * 5000) / plan.nbDownloads);
  const savings = unitPriceMGA < basePriceMGA ? Math.round((basePriceMGA - unitPriceMGA) / basePriceMGA * 100) : 0;

  if (plan.nbDownloads <= 50) {
    return [
      "Parfait pour tester",
      "Support par email",
      "Données structurées Excel"
    ];
  } else if (plan.nbDownloads <= 150) {
    return [
      `Économisez ${savings}%`,
      "Pack le plus populaire",
      "Support prioritaire"
    ];
  } else if (plan.nbDownloads <= 350) {
    return [
      `Économisez ${savings}%`,
      "Idéal projets moyens",
      "Support technique dédié"
    ];
  } else if (plan.nbDownloads <= 700) {
    return [
      `Économisez ${savings}%`,
      "Volume professionnel",
      "Support prioritaire 24/7"
    ];
  } else {
    return [
      `Économisez ${savings}%`,
      "Meilleur rapport qualité/prix",
      "Support entreprise"
    ];
  }
};

// Convertir les plans en format d'affichage avec prix uniquement en MGA
const PRICING_PLANS: PricingPlanDisplay[] = PLANS.map(plan => {
  const priceMGA = `${(plan.price * 5000).toLocaleString('fr-FR')} MGA`;
  
  return {
    name: plan.name,
    price: priceMGA,
    desc: `${plan.nbDownloads.toLocaleString()} extractions`,
    features: formatPlanFeatures(plan),
    cta: plan.popular ? "Choix optimal" : "Choisir ce pack",
    popular: plan.popular || false,
    packId: plan.id,
    nbDownloads: plan.nbDownloads,
    disabled: false
  };
});

export default function PricingPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<PricingPlanDisplay | null>(null);

  const handlePay = (plan: PricingPlanDisplay) => {
    if (!token) {
      toast({ 
        title: "Connexion requise", 
        description: "Vous devez être connecté pour acheter un pack.",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }
    setSelectedPlanForModal(plan);
    setIsModalOpen(true);
  };

  const proceedToStripePayment = async () => {
    if (!selectedPlanForModal || !selectedPlanForModal.packId) {
      toast({ title: "Erreur", description: "Aucun pack sélectionné.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setSelectedPlanId(selectedPlanForModal.packId);
    setIsModalOpen(false);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/payment/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ packId: selectedPlanForModal.packId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'La création de la session de paiement a échoué.');
      }

      const { url } = await response.json();
      window.location.href = url;

    } catch (error) {
      console.error("Payment creation error:", error);
      toast({
        title: "Erreur de paiement",
        description: error instanceof Error ? error.message : "Une erreur inconnue est survenue.",
        variant: "destructive",
      });
      setLoading(false);
      setSelectedPlanId(null);
    }
  };

  const handleMobileBankingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      nom: formData.get('nom'),
      telephone: formData.get('telephone'),
      pack: formData.get('pack'),
      reference: formData.get('reference'),
      url: formData.get('url'),
      email: formData.get('email'),
      description: formData.get('description')
    };
    
    // Créer l'email avec les données pré-remplies
    const subject = encodeURIComponent(`Demande Mobile Banking - ${data.pack}`);
    const body = encodeURIComponent(`
Bonjour,

Je souhaite effectuer un paiement par Mobile Banking pour :

📦 Pack sélectionné : ${data.pack}
👤 Nom : ${data.nom}
📱 Téléphone : ${data.telephone}
💳 Référence transaction : ${data.reference}
📧 Email : ${data.email}

🔗 URL à scraper : ${data.url}

📝 Description :
${data.description}

Merci de traiter ma demande dans les 48h.

Cordialement,
${data.nom}
    `);
    
    const mailtoLink = `mailto:support@easyscrapymg.com?subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;
    
    toast({
      title: "Email ouvert",
      description: "Votre client email va s'ouvrir avec les informations pré-remplies.",
    });
  };

  return (
    <>
      <PaymentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStripePay={proceedToStripePayment}
        planName={selectedPlanForModal?.name || ''}
      />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        {/* Hero Section */}
        <section className="w-full max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              Tarification transparente
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
              Choisissez votre pack
              <span className="block text-blue-600">d'extractions</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Paiement unique, aucun abonnement. Plus vous prenez d'extractions, moins vous payez par unité.
            </p>

            {/* Trust Indicators */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="flex items-center justify-center gap-3 text-gray-600">
                <Shield className="w-6 h-6 text-green-500" />
                <span className="font-medium">Paiement sécurisé</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-gray-600">
                <Clock className="w-6 h-6 text-blue-500" />
                <span className="font-medium">Accès immédiat</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-gray-600">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <span className="font-medium">Aucun engagement</span>
              </div>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Packages d'Extractions
              </h2>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-8">
                <CheckCircle className="w-4 h-4" />
                Économisez jusqu'à 38% avec les gros volumes
              </div>
            </div>
            
            <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 justify-items-center items-stretch">
              {PRICING_PLANS.map((plan, i) => (
                <PricingPlan key={i} plan={plan} onClickPay={handlePay} isLoading={loading && selectedPlanId === plan.packId} />
              ))}
            </div>
          </div>
        </section>

        {/* Mobile Banking Section */}
        <section className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 py-16">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center space-y-6 mb-12">
              <div className="flex items-center justify-center gap-2 text-blue-700">
                <Smartphone className="w-8 h-8" />
                <h2 className="text-3xl font-bold">Paiement Mobile Banking</h2>
              </div>
              
              <p className="text-blue-800 max-w-2xl mx-auto text-lg">
                Vous préférez payer par <strong>MVola, Orange Money ou Airtel Money</strong> ? 
                Remplissez le formulaire ci-dessous pour une demande personnalisée.
              </p>
              
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-6 py-3 rounded-full font-medium">
                <span>📱</span>
                Effectuez votre paiement au : <strong>032 12 345 67</strong>
              </div>
            </div>

            {/* Formulaire Mobile Banking */}
            <div className="max-w-2xl mx-auto">
              <form onSubmit={handleMobileBankingSubmit} className="space-y-6 bg-white rounded-2xl p-8 shadow-lg border border-blue-200">
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Nom complet *
                    </label>
                    <input 
                      type="text"
                      name="nom"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Votre nom et prénom"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Téléphone *
                    </label>
                    <input 
                      type="tel"
                      name="telephone"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+261 32 12 345 67"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Pack souhaité *
                  </label>
                  <select name="pack" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                    <option value="">Sélectionnez un pack</option>
                    <option value="Pack Découverte - 25 000 MGA (50 extractions)">Pack Découverte - 25 000 MGA (50 extractions)</option>
                    <option value="Pack Essentiel - 60 000 MGA (150 extractions)">Pack Essentiel - 60 000 MGA (150 extractions)</option>
                    <option value="Pack Business - 125 000 MGA (350 extractions)">Pack Business - 125 000 MGA (350 extractions)</option>
                    <option value="Pack Pro - 225 000 MGA (700 extractions)">Pack Pro - 225 000 MGA (700 extractions)</option>
                    <option value="Pack Enterprise - 400 000 MGA (1300 extractions)">Pack Enterprise - 400 000 MGA (1300 extractions)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Référence de transaction *
                  </label>
                  <input 
                    type="text"
                    name="reference"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: MVL123456789 ou OM987654321"
                    required
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Référence de votre transaction mobile banking
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Votre email *
                  </label>
                  <input 
                    type="email"
                    name="email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="votre@email.com"
                    required
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Pour recevoir vos données extraites
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    URL à scraper *
                  </label>
                  <input 
                    type="url"
                    name="url"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://www.facebook.com/marketplace/..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Description de la recherche *
                  </label>
                  <textarea 
                    name="description"
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Décrivez ce que vous souhaitez extraire (ex: annonces immobilières à Antananarivo, voitures d'occasion, etc.)"
                    required
                  ></textarea>
                </div>

                <div className="text-center space-y-4">
                  <button 
                    type="submit"
                    className="w-full bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Mail className="w-5 h-5" />
                    Envoyer la demande
                  </button>
                  
                  <div className="flex items-center justify-center gap-2 text-sm text-blue-700">
                    <Clock className="w-4 h-4" />
                    <span>Traitement sous 48h maximum</span>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full bg-gradient-to-r from-gray-900 to-gray-800 py-16">
          <div className="max-w-4xl mx-auto px-4 text-center text-white">
            <h3 className="text-3xl font-bold mb-4">
              Prêt à automatiser vos extractions ?
            </h3>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Choisissez votre pack et commencez immédiatement. 
              Pas d'abonnement, utilisez vos crédits quand vous voulez.
            </p>
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="bg-white text-gray-900 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
            >
              Voir les packs
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section>
      </div>
    </>
  );
}