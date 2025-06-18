import React from "react";
import { Button } from "@/components/ui/button";
import { PLANS, Pack } from "@/lib/plans";
import { Loader2, Settings, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type ScrapeFormProps = {
  url: string;
  setUrl: (val: string) => void;
  loading: boolean;
  selectedPackId: string;
  setSelectedPackId: (id: string) => void;
  selectedPack: Pack;
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
  selectedPackId,
  setSelectedPackId,
  selectedPack,
  onScrape,
}: ScrapeFormProps) {
  const [singleItemMode, setSingleItemMode] = React.useState(false);
  const [deepScrape, setDeepScrape] = React.useState(false);
  const [getProfileUrls, setGetProfileUrls] = React.useState(false);
  const [maxItems, setMaxItems] = React.useState([selectedPack.nbDownloads]);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  
  // Mettre à jour maxItems quand le pack change
  React.useEffect(() => {
    setMaxItems([selectedPack.nbDownloads]);
  }, [selectedPack.nbDownloads]);
  
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
      singleItem: singleItemMode,
      deepScrape,
      getProfileUrls,
      maxItems: maxItems[0]
    });
  };

  return (
    <section className="mx-auto w-full max-w-2xl flex flex-col items-center mb-1 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full bg-white bg-opacity-90 rounded-2xl border border-border shadow-md flex flex-col gap-4 px-4 py-5 animate-fade-in"
        autoComplete="off"
      >
        {/* URL Input */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          <input
            className="flex-1 border border-blue-200 rounded-lg px-5 py-3 text-lg focus:ring-2 focus:ring-blue-400 focus:outline-none bg-muted shadow-inner font-sans"
            type="url"
            placeholder="Lien Marketplace…"
            value={url}
            onChange={e => setUrl(e.target.value)}
            required
          />
          
          {/* Pack Selection */}
          <select
            className="border border-blue-200 rounded-lg px-3 py-2 text-base bg-muted focus:ring-2 focus:ring-blue-400 font-sans min-w-[180px] font-semibold"
            value={selectedPackId}
            onChange={e => setSelectedPackId(e.target.value)}
            aria-label="Pack sélectionné"
          >
            {PLANS.map(plan => (
              <option
                value={plan.id}
                key={plan.id}
                className={plan.popular ? "font-bold bg-blue-100" : ""}
              >
                {plan.name} ({plan.nbDownloads} téléchargements)
              </option>
            ))}
          </select>
        </div>

        {/* Basic Options */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="singleItemMode"
              checked={singleItemMode}
              onChange={(e) => setSingleItemMode(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="singleItemMode" className="text-sm font-medium text-gray-700">
              1 seule annonce
            </label>
          </div>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Options avancées
          </Button>
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configuration APIFY
              </h3>
              
              {/* Max Items Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Nombre maximum d'éléments
                  </Label>
                  <span className="text-sm font-bold text-primary">
                    {maxItems[0]}
                  </span>
                </div>
                <Slider
                  value={maxItems}
                  onValueChange={setMaxItems}
                  max={selectedPack.nbDownloads}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-gray-600">
                  Limite basée sur votre pack ({selectedPack.nbDownloads} max)
                </p>
              </div>

              {/* Deep Scrape Option */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="deepScrape" className="text-sm font-medium">
                    Deep Scrape
                  </Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Collecte des informations détaillées supplémentaires. 
                        Plus lent mais plus complet.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  id="deepScrape"
                  checked={deepScrape}
                  onCheckedChange={setDeepScrape}
                />
              </div>

              {/* Get Profile URLs Option */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="getProfileUrls" className="text-sm font-medium">
                    URLs des profils
                  </Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Collecte également les URLs des profils des vendeurs.
                        Utile pour l'analyse des vendeurs.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  id="getProfileUrls"
                  checked={getProfileUrls}
                  onCheckedChange={setGetProfileUrls}
                />
              </div>

              {/* Performance Warning */}
              {(deepScrape || getProfileUrls) && maxItems[0] > 100 && (
                <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-yellow-600" />
                    <p className="text-xs text-yellow-800">
                      <strong>Performance :</strong> Les options avancées peuvent ralentir 
                      le scraping pour de gros volumes. Considérez réduire le nombre d'éléments.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <Button 
          type="submit" 
          className="h-12 min-w-[150px] text-lg font-bold bg-gradient-to-r from-blue-400 to-primary text-white shadow-lg hover:scale-105 duration-150"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="inline-block animate-spin mr-2" /> 
              {deepScrape ? "Deep Scraping…" : "Scraping…"}
            </>
          ) : (
            `Scraper${deepScrape ? " (Mode avancé)" : ""}`
          )}
        </Button>
      </form>
    </section>
  );
}