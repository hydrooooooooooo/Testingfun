import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import PricingPlan from "@/components/PricingPlan";
import { PLANS } from "@/lib/plans";
import { toast } from "@/hooks/use-toast";
<<<<<<< HEAD
import { CheckCircle, Star, Shield, Clock, Users, Sparkles } from "lucide-react";
=======
import { CheckCircle, Star, Shield, Clock, Users, Smartphone, Mail, ArrowRight, Zap } from "lucide-react";
>>>>>>> restauration-f7
import { useNavigate } from "react-router-dom";
import type { Pack } from "@/lib/plans";
import type { PricingPlanDisplay } from "@/components/PricingPlan";

<<<<<<< HEAD
// Configurer le lien de paiement fixe
const FIXED_PAYMENT_LINK = import.meta.env.VITE_STRIPE_PAYMENT_LINK || "https://buy.stripe.com/test_8wg29z1Uy7Kk0Y88ww";

=======
>>>>>>> restauration-f7
// Fonction pour générer un ID de session unique
const generateSessionId = () => {
  return `temp_${Math.random().toString(36).substring(2, 15)}`;
};

// Fonction pour formater les features de manière plus claire
const formatPlanFeatures = (plan: Pack): string[] => {
  const basePriceMGA = 500; // Prix unitaire de référence
<<<<<<< HEAD
  const unitPriceMGA = Math.round((plan.price * 5000) / plan.nbDownloads); // Calcul approximatif
=======
  const unitPriceMGA = Math.round((plan.price * 5000) / plan.nbDownloads);
>>>>>>> restauration-f7
  const savings = unitPriceMGA < basePriceMGA ? Math.round((basePriceMGA - unitPriceMGA) / basePriceMGA * 100) : 0;

  if (plan.nbDownloads <= 50) {
    return [
<<<<<<< HEAD
      "Parfait pour découvrir",
      "Aucun engagement",
      "Extractions sans expiration"
    ];
  } else if (plan.nbDownloads <= 150) {
    return [
      `Économisez ${savings}% par extraction`,
      "Pack le plus demandé",
=======
      "Parfait pour tester",
      "Support par email",
      "Données structurées Excel"
    ];
  } else if (plan.nbDownloads <= 150) {
    return [
      `Économisez ${savings}%`,
      "Pack le plus populaire",
>>>>>>> restauration-f7
      "Support prioritaire"
    ];
  } else if (plan.nbDownloads <= 350) {
    return [
<<<<<<< HEAD
      `Économisez ${savings}% par extraction`,
      "Parfait pour projets moyens",
=======
      `Économisez ${savings}%`,
      "Idéal projets moyens",
>>>>>>> restauration-f7
      "Support technique dédié"
    ];
  } else if (plan.nbDownloads <= 700) {
    return [
<<<<<<< HEAD
      `Économisez ${savings}% par extraction`,
=======
      `Économisez ${savings}%`,
>>>>>>> restauration-f7
      "Volume professionnel",
      "Support prioritaire 24/7"
    ];
  } else {
    return [
<<<<<<< HEAD
      `Économisez ${savings}% par extraction`,
      "Tarif le plus avantageux",
      "Support entreprise dédié"
=======
      `Économisez ${savings}%`,
      "Meilleur rapport qualité/prix",
      "Support entreprise"
>>>>>>> restauration-f7
    ];
  }
};

<<<<<<< HEAD
// Convertir les plans API en plans d'affichage pour le composant PricingPlan
const PRICING_PLANS: PricingPlanDisplay[] = PLANS.map(plan => {
  const unitPriceMGA = Math.round((plan.price * 5000) / plan.nbDownloads);
  const basePriceMGA = 500;
  const savings = unitPriceMGA < basePriceMGA ? Math.round((basePriceMGA - unitPriceMGA) / basePriceMGA * 100) : 0;
  
  return {
    name: plan.name,
    price: plan.priceLabel.split(' / ')[1] || plan.priceLabel, // Prendre la partie MGA
=======
// Convertir les plans en format d'affichage avec prix uniquement en MGA
const PRICING_PLANS: PricingPlanDisplay[] = PLANS.map(plan => {
  const priceMGA = `${(plan.price * 5000).toLocaleString('fr-FR')} MGA`;
  
  return {
    name: plan.name,
    price: priceMGA,
>>>>>>> restauration-f7
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
<<<<<<< HEAD
=======
  const navigate = useNavigate();
>>>>>>> restauration-f7
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  
  useEffect(() => {
    const tempSessionId = generateSessionId();
    setSessionId(tempSessionId);
<<<<<<< HEAD
    console.log(`Session temporaire créée: ${tempSessionId}`);
=======
>>>>>>> restauration-f7
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
      
<<<<<<< HEAD
      if (isDev) {
        console.log(`Session ID: ${sessionId}, Pack ID: ${packId}`);
        console.log(`Lien de paiement: ${FIXED_PAYMENT_LINK}`);
      }
      
      const paymentUrl = `${FIXED_PAYMENT_LINK}?client_reference_id=${sessionId}&session_id=${sessionId}&pack_id=${packId}`;
      
=======
      // Stocker les informations du pack sélectionné
>>>>>>> restauration-f7
      localStorage.setItem('selectedPackId', packId);
      localStorage.setItem('currentSessionId', sessionId);
      localStorage.setItem('selectedPackInfo', JSON.stringify({
        name: plan.name,
        price: plan.price,
        nbDownloads: plan.nbDownloads
      }));
      
      toast({
        title: "Pack sélectionné",
        description: `${plan.name} - Redirection vers l'accueil pour commencer...`,
      });
      
<<<<<<< HEAD
      setTimeout(() => {
        window.open(paymentUrl, "_blank");
=======
      // Redirection vers l'accueil avec paramètres pour pré-remplir
      setTimeout(() => {
        navigate(`/?pack=${packId}&extractions=${plan.nbDownloads}`);
>>>>>>> restauration-f7
        setLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error('Erreur lors de la sélection du pack:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue. Veuillez réessayer.",
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
<<<<<<< HEAD
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
=======
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
>>>>>>> restauration-f7
    });
  };

  return (
    <Layout>
<<<<<<< HEAD
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
=======
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
>>>>>>> restauration-f7
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

<<<<<<< HEAD
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
=======
          {/* Pricing Cards */}
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Packages d'Extractions
              </h2>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-8">
                <CheckCircle className="w-4 h-4" />
                Économisez jusqu'à 38% avec les gros volumes
>>>>>>> restauration-f7
              </div>
            </div>
            
            <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 justify-items-center items-stretch">
              {PRICING_PLANS.map((plan, i) => (
                <PricingPlan key={i} plan={plan} onClickPay={handlePay} />
              ))}
            </div>
          </div>
        </section>

<<<<<<< HEAD
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
=======
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
>>>>>>> restauration-f7
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
    </Layout>
  );
}