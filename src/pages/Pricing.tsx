import React, { useState, useEffect } from "react";
import PricingPlan from "@/components/PricingPlan";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import type { PricingPlanDisplay } from "@/components/PricingPlan";

// Fonction pour générer les features des plans de manière dynamique
const formatPlanFeatures = (plan: any): string[] => {
  const basePriceMGA = 500; // Prix unitaire de référence pour le calcul des économies
  const unitPriceMGA = Math.round(plan.price / plan.nb_downloads);
  const savings = unitPriceMGA < basePriceMGA ? Math.round(((basePriceMGA - unitPriceMGA) / basePriceMGA) * 100) : 0;

  if (plan.nb_downloads <= 50) {
    return ["Parfait pour tester", "Support par email", "Données structurées Excel"];
  } else if (plan.nb_downloads <= 150) {
    return [`Économisez ${savings}%`, "Pack le plus populaire", "Support prioritaire"];
  } else if (plan.nb_downloads <= 350) {
    return [`Économisez ${savings}%`, "Idéal projets moyens", "Support technique dédié"];
  } else if (plan.nb_downloads <= 700) {
    return [`Économisez ${savings}%`, "Volume professionnel", "Support prioritaire 24/7"];
  } else {
    return [`Économisez ${savings}%`, "Meilleur rapport qualité/prix", "Support entreprise"];
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
        const plans: PricingPlanDisplay[] = response.data.map((plan: any) => ({
          name: plan.name,
          price: `${plan.price.toLocaleString('fr-FR')} MGA`,
          desc: `${plan.nb_downloads.toLocaleString()} extractions`,
          features: formatPlanFeatures(plan),
          cta: plan.popular ? "Choix optimal" : "Choisir ce pack",
          popular: plan.popular || false,
          packId: plan.id,
          nbDownloads: plan.nb_downloads,
          disabled: false,
        }));
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
    <main className="bg-gray-50 min-h-screen">
      <section className="w-full bg-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
              Des tarifs flexibles pour chaque besoin
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-gray-600">
              Choisissez le pack qui correspond à votre volume d'extraction et commencez à scraper en quelques secondes.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Économisez jusqu'à 38% avec les gros volumes
            </div>
          </div>

          <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 justify-items-center items-stretch">
            {loading ? (
              <div className="col-span-full flex justify-center items-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
              </div>
            ) : (
              pricingPlans.map((plan) => (
                <PricingPlan 
                  key={plan.packId} 
                  plan={plan} 
                  onClickPay={() => handleSelectPack(plan)} 
                  isLoading={false} 
                />
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}