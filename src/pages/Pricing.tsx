import React, { useState, useEffect } from "react";
import PricingPlan from "@/components/PricingPlan";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import type { PricingPlanDisplay } from "@/components/PricingPlan";
import SEOHead from '@/components/seo/SEOHead';

// Fonction pour générer les features des plans de manière dynamique
const formatPlanFeatures = (plan: any): string[] => {
  const basePriceMGA = 500; // Prix unitaire de référence pour le calcul des économies
  const unitPriceMGA = Math.round(plan.price / plan.nb_downloads);
  const savings = unitPriceMGA < basePriceMGA ? Math.round(((basePriceMGA - unitPriceMGA) / basePriceMGA) * 100) : 0;

  if (plan.nb_downloads <= 300) {
    return ["Parfait pour démarrer", "Support par email", "Données structurées Excel"];
  } else if (plan.nb_downloads <= 1000) {
    return [`Économisez ${savings}%`, "Pack le plus populaire", "Support prioritaire"];
  } else {
    return [`Économisez ${savings}%`, "Meilleur rapport qualité/prix", "Support entreprise 24/7"];
  }
};

export default function PricingPage() {
  const navigate = useNavigate();
  const [pricingPlans, setPricingPlans] = useState<PricingPlanDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPacks = async () => {
      setLoading(true);
      try {
        const response = await api.get('/packs');
        const plans: PricingPlanDisplay[] = response.data.map((plan: any) => {
          // Afficher le prix réel de la base (en Ariary)
          const originalPrice = Number(plan.price) || 0;
          const priceDisplay = `${originalPrice.toLocaleString('fr-FR')} MGA`;
          const desc = `${Number(plan.nb_downloads).toLocaleString('fr-FR')} analyses`;
          const descriptionBullets = (plan.description || '')
            .split('|')
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);
          const features = [desc, ...descriptionBullets];
          return {
            name: plan.name,
            price: priceDisplay,
            desc,
            features: features.length > 0 ? features : formatPlanFeatures(plan),
            cta: plan.popular ? 'Choix optimal' : 'Choisir ce pack',
            popular: !!plan.popular,
            packId: plan.id,
            nbDownloads: plan.nb_downloads,
            disabled: false,
          } as PricingPlanDisplay;
        });
        setPricingPlans(plans);
      } catch (error) {
        console.error("Failed to fetch packs:", error);
        toast({ title: "Erreur", description: "Impossible de charger les packs.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchPacks();
  }, []);

  const handleSelectPack = (plan: PricingPlanDisplay) => {
    navigate(`/?packId=${plan.packId}`);
  };

  return (
    <main className="bg-cream-50 min-h-screen">
      <SEOHead
        title="Tarifs — Packs de credits"
        description="Decouvrez nos offres de credits pour l'analyse de donnees sociales. Pas d'abonnement, payez uniquement ce que vous utilisez."
        path="/pricing"
        alternatePath="/en/pricing"
      />
      <section className="w-full bg-white py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-navy tracking-tight mb-4">
              Des tarifs flexibles pour chaque besoin
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-steel">
              Choisissez le pack qui correspond à votre volume d'analyse et commencez à analyser en quelques secondes.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 bg-gold/20 text-navy px-4 py-2 rounded-full text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Économisez jusqu'à 38% avec les gros volumes
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-navy" />
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-6">
              {pricingPlans.map((plan) => (
                <div key={plan.packId} className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] xl:w-[260px]">
                  <PricingPlan
                    plan={plan}
                    onClickPay={() => handleSelectPack(plan)}
                    isLoading={false}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}