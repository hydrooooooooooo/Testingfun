import React, { useState, useEffect } from "react";
import PricingPlan from "@/components/PricingPlan";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import PaymentModal from "@/components/PaymentModal";
import type { PricingPlanDisplay } from "@/components/PricingPlan";
import SEOHead from '@/components/seo/SEOHead';
import { useLocale } from '@/hooks/useLocale';

export default function PricingPage() {
  const { locale, t } = useLocale();
  const isFr = locale === 'fr';
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [pricingPlans, setPricingPlans] = useState<PricingPlanDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPack, setSelectedPack] = useState<PricingPlanDisplay | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const fetchPacks = async () => {
      setLoading(true);
      try {
        const response = await api.get('/packs');
        const plans: PricingPlanDisplay[] = response.data.map((plan: any) => {
          // Use price_label if available (formatted "25 € / 115 000 Ar"), otherwise format EUR
          const priceEurCents = Number(plan.price_eur) || 0;
          const priceEur = priceEurCents / 100;
          const priceMGA = Number(plan.price) || 0;
          const priceDisplay = plan.price_label
            || (priceEur > 0 ? `${priceEur.toLocaleString('fr-FR')} €` : `${priceMGA.toLocaleString('fr-FR')} MGA`);
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
            features: features.length > 0 ? features : [],
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
    if (!isAuthenticated()) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/pricing&packId=${plan.packId}`);
      return;
    }
    setSelectedPack(plan);
  };

  const handleStripePay = async (currency: 'eur' | 'mga') => {
    if (!selectedPack) return;
    setPaying(true);
    try {
      const response = await api.post('/payment/buy-pack', {
        packId: selectedPack.packId,
        currency,
      });
      const { url } = response.data;
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Erreur de paiement",
        description: error.response?.data?.message || "Impossible de créer la session de paiement.",
        variant: "destructive",
      });
    } finally {
      setPaying(false);
    }
  };

  const handleMvolaPay = async () => {
    toast({ title: "MVola", description: "Le paiement MVola sera bientôt disponible." });
  };

  return (
    <main className="bg-cream-50 min-h-screen">
      <SEOHead
        title={t.seo.pricing_title}
        description={t.seo.pricing_desc}
        path={isFr ? '/pricing' : '/en/pricing'}
        locale={isFr ? 'fr_FR' : 'en_US'}
        alternatePath={isFr ? '/en/pricing' : '/pricing'}
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
                    isLoading={paying && selectedPack?.packId === plan.packId}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={!!selectedPack}
        onClose={() => setSelectedPack(null)}
        onStripePay={handleStripePay}
        onMvolaPay={handleMvolaPay}
        planName={selectedPack?.name || ''}
      />
    </main>
  );
}
