import React from "react";
import { Button } from "@/components/ui/button";
import { Pack } from "@/lib/plans";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type ScrapeFormProps = {
  url: string;
  setUrl: (val: string) => void;
  loading: boolean;
  packs: Pack[];
  selectedPackId: string | null;
  setSelectedPackId: (id: string) => void;
  selectedPack: Pack | null;
  onScrape: (e: React.FormEvent, options?: { 
    singleItem?: boolean;
    deepScrape?: boolean;
    getProfileUrls?: boolean;
    maxItems?: number;
  }) => void;
};

export default function ScrapeForm({
  url,
  setUrl,
  loading,
  packs,
  selectedPackId,
  setSelectedPackId,
  selectedPack,
  onScrape,
}: ScrapeFormProps) {
  const [deepScrape] = React.useState(true);
  const [maxItems, setMaxItems] = React.useState([1]);
  
  // Mettre à jour maxItems quand le pack change
  React.useEffect(() => {
    if (selectedPack) {
      setMaxItems([selectedPack.nbDownloads]);
    }
  }, [selectedPack]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation des options
    if (deepScrape && maxItems[0] > 100) {
      toast({
        title: "Attention",
        description: "Le mode deep scrape est recommandé pour moins de 100 éléments pour des performances optimales.",
        variant: "default",
      });
    }
    
    onScrape(e, {
      singleItem: false,
      deepScrape,
      getProfileUrls: false,
      maxItems: maxItems[0],
    });
  };

  return (
    <section className="mx-auto w-full max-w-2xl flex flex-col items-center mb-1 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full bg-white/90 backdrop-blur rounded-3xl border border-cream-200 shadow-xl flex flex-col gap-4 px-5 md:px-6 py-5 animate-fade-in"
        autoComplete="off"
      >
        {/* URL Input */}
        <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4">
          <input
            className="flex-1 h-12 border border-cream-300 rounded-xl px-4 md:px-5 text-base md:text-lg focus:ring-2 focus:ring-navy focus:outline-none focus:border-navy bg-white placeholder:text-steel-200 shadow-sm font-sans"
            type="url"
            placeholder="Lien Marketplace…"
            value={url}
            onChange={e => setUrl(e.target.value)}
            required
          />
          
          {/* Pack Selection */}
          <select
            className="h-12 border border-cream-300 rounded-xl px-3 md:px-4 text-base bg-white focus:ring-2 focus:ring-steel focus:border-steel font-sans min-w-[180px] font-semibold shadow-sm"
            value={selectedPackId || ''}
            onChange={e => setSelectedPackId(e.target.value)}
            aria-label="Pack sélectionné"
            disabled={!selectedPack}
          >
            {packs.map(plan => (
              <option
                value={plan.id}
                key={plan.id}
                className={plan.popular ? "font-bold bg-navy-100" : ""}
              >
                {plan.name} ({plan.nbDownloads} téléchargements)
              </option>
            ))}
          </select>
        </div>

        {/* Options supprimées selon la demande: pas de mode 1 seule annonce ni d'options avancées. */}

        {/* Submit Button */}
        <Button 
          type="submit" 
          className="h-12 min-w-[150px] text-base md:text-lg font-semibold rounded-xl bg-gradient-to-r from-navy to-steel text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-80 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="inline-block animate-spin mr-2" /> 
              Scraping…
            </>
          ) : (
            "Lancer l'extraction"
          )}
        </Button>
        <p className="text-xs md:text-sm text-steel mt-2 md:mt-3">
          Note: il est nécessaire d'être inscrit sur la plateforme pour pouvoir télécharger les données.
        </p>
      </form>
    </section>
  );
}