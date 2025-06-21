import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import PricingPlan from "@/components/PricingPlan";
import PricingFeatures from "@/components/PricingFeatures";
import { PLANS } from "@/lib/plans";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, Star, Shield, Clock, Users, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Pack } from "@/lib/plans";
import type { PricingPlanDisplay } from "@/components/PricingPlan";

// Configurer le lien de paiement fixe
const FIXED_PAYMENT_LINK = import.meta.env.VITE_STRIPE_PAYMENT_LINK || "https://buy.stripe.com/test_8wg29z1Uy7Kk0Y88ww";

// Fonction pour générer un ID de session unique
const generateSessionId = () => {
  return `temp_${Math.random().toString(36).substring(2, 15)}`;
};

// Vérifier si l'environnement est en mode développement
const isDev = import.meta.env.MODE === 'development';

// Fonction pour formater les features de manière plus claire
const formatPlanFeatures = (plan: Pack): string[] => {
  const basePriceMGA = 500; // Prix unitaire de référence
  const unitPriceMGA = Math.round((plan.price * 5000) / plan.nbDownloads); // Calcul approximatif
  const savings = unitPriceMGA < basePriceMGA ? Math.round((basePriceMGA - unitPriceMGA) / basePriceMGA * 100) : 0;

  if (plan.nbDownloads <= 50) {
    return [
      "Parfait pour découvrir",
      "Aucun engagement",
      "Extractions sans expiration"
    ];
  } else if (plan.nbDownloads <= 150) {
    return [
      `Économisez ${savings}% par extraction`,
      "Pack le plus demandé",
      "Support prioritaire"
    ];
  } else if (plan.nbDownloads <= 350) {
    return [
      `Économisez ${savings}% par extraction`,
      "Parfait pour projets moyens",
      "Support technique dédié"
    ];
  } else if (plan.nbDownloads <= 700) {
    return [
      `Économisez ${savings}% par extraction`,
      "Volume professionnel",
      "Support prioritaire 24/7"
    ];
  } else {
    return [
      `Économisez ${savings}% par extraction`,
      "Tarif le plus avantageux",
      "Support entreprise dédié"
    ];
  }
};

// Convertir les plans API en plans d'affichage pour le composant PricingPlan
const PRICING_PLANS: PricingPlanDisplay[] = PLANS.map(plan => {
  const unitPriceMGA = Math.round((plan.price * 5000) / plan.nbDownloads);
  const basePriceMGA = 500;
  const savings = unitPriceMGA < basePriceMGA ? Math.round((basePriceMGA - unitPriceMGA) / basePriceMGA * 100) : 0;
  
  return {
    name: plan.name,
    price: plan.priceLabel.split(' / ')[1] || plan.priceLabel, // Prendre la partie MGA
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
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  
  useEffect(() => {
    const tempSessionId = generateSessionId();
    setSessionId(tempSessionId);
    console.log(`Session temporaire créée: ${tempSessionId}`);
  }, []);
  
  const handlePay = async (plan: PricingPlanDisplay) => {
    try {
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
      
      if (isDev) {
        console.log(`Session ID: ${sessionId}, Pack ID: ${packId}`);
        console.log(`Lien de paiement: ${FIXED_PAYMENT_LINK}`);
      }
      
      const paymentUrl = `${FIXED_PAYMENT_LINK}?client_reference_id=${sessionId}&session_id=${sessionId}&pack_id=${packId}`;
      
      localStorage.setItem('selectedPackId', packId);
      localStorage.setItem('currentSessionId', sessionId);
      
      toast({
        title: "Redirection vers le paiement",
        description: "Vous allez être redirigé vers notre page de paiement sécurisé.",
      });
      
      setTimeout(() => {
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

  const handleMobileBankingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      nom: formData.get('nom'),
      telephone: formData.get('telephone'),
      pack: formData.get('pack'),
      reference: formData.get('reference'),
      url: formData.get('url'),
      description: formData.get('description')
    };
    
    // Créer l'email avec les données
    const subject = `Demande Mobile Banking - ${data.pack}`;
    const body = `
Bonjour,

Je souhaite effectuer un paiement par Mobile Banking.

Informations de contact:
- Nom: ${data.nom}
- Téléphone: ${data.telephone}

Détails de la commande:
- Pack: ${data.pack}
- Référence de transaction: ${data.reference}

Recherche souhaitée:
- URL à scraper: ${data.url}
- Description: ${data.description}

Merci de traiter ma demande dans les 48h.

Cordialement.
    `;
    
    const mailtoLink = `mailto:support@easyscrapymg.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink);
    
    toast({
      title: "Email préparé",
      description: "Votre client email va s'ouvrir avec la demande pré-remplie.",
    });
  };

  return (
    <Layout>
      <div className="bg-gradient-to-br from-muted/30 via-background to-muted/30 min-h-screen">
        <section className="mx-auto w-full max-w-7xl py-16 px-4 flex flex-col gap-12">
          
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 bg-muted text-muted-foreground px-4 py-2 rounded-full text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Paiement à l'usage • Économies progressives
            </div>
            
            <h1 className="text-5xl md:text-6xl font-extrabold text-foreground leading-tight">
              Tarifs{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                sur mesure
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              <span className="font-semibold text-primary">Payez uniquement ce dont vous avez besoin</span>.
              Plus vous prenez d'extractions, moins vous payez par unité.
              <br />
              Paiement unique et sécurisé, utilisez vos extractions quand vous voulez.
            </p>
          </div>

          {/* Features Section */}
          <PricingFeatures />

          {/* Pricing Cards */}
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Packages d'Extractions
              </h2>
              <p className="text-lg text-muted-foreground mb-2">
                Plus vous achetez, moins vous payez par extraction
              </p>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                Économisez jusqu'à 38% par rapport au tarif unitaire
              </div>
            </div>
            
            <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 justify-items-center items-stretch">
              {PRICING_PLANS.map((plan, i) => (
                <PricingPlan key={i} plan={plan} onClickPay={handlePay} />
              ))}
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
            <div className="text-center space-y-6">
              <h3 className="text-2xl font-bold text-foreground">
                Pourquoi choisir EasyScrapyMG ?
              </h3>
              
              <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
                <div className="flex items-center justify-center gap-3 text-muted-foreground">
                  <Shield className="w-6 h-6 text-green-500" />
                  <span className="font-medium">Paiement sécurisé par Stripe</span>
                </div>
                <div className="flex items-center justify-center gap-3 text-muted-foreground">
                  <Clock className="w-6 h-6 text-primary" />
                  <span className="font-medium">Accès immédiat</span>
                </div>
                <div className="flex items-center justify-center gap-3 text-muted-foreground">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <span className="font-medium">Aucun abonnement</span>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground italic max-w-2xl mx-auto">
                Extractions activées instantanément après paiement. 
                Aucun engagement, aucune facturation récurrente, utilisez-les à votre rythme.
              </p>
            </div>
          </div>

          {/* Mobile Banking Section */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-8">
            <div className="text-center space-y-6 mb-8">
              <div className="flex items-center justify-center gap-2 text-amber-700">
                <Users className="w-6 h-6" />
                <h3 className="text-2xl font-bold">Paiement Mobile Banking</h3>
              </div>
              
              <p className="text-amber-800 max-w-2xl mx-auto">
                <span className="font-semibold">Vous préférez payer par Mobile Banking ?</span>
                <br />
                Remplissez le formulaire ci-dessous avec votre référence de transaction et la recherche souhaitée.
              </p>
              
              <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-medium">
                <span>📱</span>
                MVola • Orange Money • Airtel Money
              </div>
            </div>

            {/* Formulaire Mobile Banking */}
            <div className="max-w-2xl mx-auto">
              <form onSubmit={handleMobileBankingSubmit} className="space-y-6 bg-white rounded-xl p-6 border border-amber-200">
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Nom complet *
                    </label>
                    <input 
                      type="text"
                      name="nom"
                      className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="Votre nom et prénom"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Téléphone *
                    </label>
                    <input 
                      type="tel"
                      name="telephone"
                      className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="+261 xx xxx xx xx"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Pack souhaité *
                  </label>
                  <select name="pack" className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary" required>
                    <option value="">Sélectionnez un pack</option>
                    <option value="Pack Découverte - 25 000 Ar (50 extractions)">Pack Découverte - 25 000 Ar (50 extractions)</option>
                    <option value="Pack Essentiel - 60 000 Ar (150 extractions)">Pack Essentiel - 60 000 Ar (150 extractions)</option>
                    <option value="Pack Business - 125 000 Ar (350 extractions)">Pack Business - 125 000 Ar (350 extractions)</option>
                    <option value="Pack Pro - 225 000 Ar (700 extractions)">Pack Pro - 225 000 Ar (700 extractions)</option>
                    <option value="Pack Enterprise - 400 000 Ar (1300 extractions)">Pack Enterprise - 400 000 Ar (1300 extractions)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Référence de transaction *
                  </label>
                  <input 
                    type="text"
                    name="reference"
                    className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Ex: MVL123456789 ou OM987654321"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Indiquez la référence de votre transaction mobile banking
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    URL à scraper *
                  </label>
                  <input 
                    type="url"
                    name="url"
                    className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="https://example.com/page-a-scraper"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Description de la recherche *
                  </label>
                  <textarea 
                    name="description"
                    rows={4}
                    className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Décrivez ce que vous souhaitez extraire (ex: annonces immobilières, produits, contacts, etc.)"
                    required
                  ></textarea>
                </div>

                <div className="text-center space-y-4">
                  <button 
                    type="submit"
                    className="bg-primary text-primary-foreground px-8 py-4 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Envoyer la demande
                  </button>
                  
                  <div className="flex items-center justify-center gap-2 text-sm text-amber-700">
                    <Clock className="w-4 h-4" />
                    <span>Délai de traitement : 48h maximum</span>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl shadow-xl p-8 text-center text-primary-foreground">
            <h3 className="text-2xl font-bold mb-4">
              Commencez avec ce dont vous avez besoin
            </h3>
            <p className="text-lg opacity-90 mb-6 max-w-2xl mx-auto">
              Pas d'abonnement, pas d'engagement. Achetez vos extractions et utilisez-les 
              quand vous voulez, au rythme qui vous convient.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <div className="bg-white/10 rounded-xl p-4">
                <div className="text-2xl font-bold mb-2">308 Ar</div>
                <div className="text-sm opacity-90">Prix le plus bas par extraction</div>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <div className="text-2xl font-bold mb-2">Aucune expiration</div>
                <div className="text-sm opacity-90">Utilisez vos extractions quand vous voulez</div>
              </div>
            </div>
          </div>

        </section>
      </div>
    </Layout>
  );
}