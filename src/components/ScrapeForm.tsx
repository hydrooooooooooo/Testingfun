
import React from "react";
import { Button } from "@/components/ui/button";
import { PLANS, Pack } from "@/lib/plans";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type ScrapeFormProps = {
  url: string;
  setUrl: (val: string) => void;
  loading: boolean;
  selectedPackId: string;
  setSelectedPackId: (id: string) => void;
  selectedPack: Pack;
  onScrape: (e: React.FormEvent, options?: { singleItem?: boolean }) => void;
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
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onScrape(e, { singleItem: singleItemMode });
  };
  return (
    <section className="mx-auto w-full max-w-2xl flex flex-col items-center mb-1 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full bg-white bg-opacity-90 rounded-2xl border border-border shadow-md flex flex-col md:flex-row items-center justify-center gap-4 px-4 py-5 animate-fade-in"
        autoComplete="off"
      >
        <input
          className="flex-1 border border-blue-200 rounded-lg px-5 py-3 text-lg focus:ring-2 focus:ring-blue-400 focus:outline-none bg-muted shadow-inner font-sans"
          type="url"
          placeholder="Lien Marketplace…"
          value={url}
          onChange={e => setUrl(e.target.value)}
          required
        />
        <div className="flex flex-col md:flex-row gap-2 items-center">
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
          <div className="flex items-center gap-2 ml-2">
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
        </div>
        <Button type="submit" className="h-12 min-w-[150px] text-lg font-bold bg-gradient-to-r from-blue-400 to-primary text-white shadow-lg hover:scale-105 duration-150">
          {loading ? (
            <>
              <Loader2 className="inline-block animate-spin mr-2" /> Scraping…
            </>
          ) : (
            "Scraper"
          )}
        </Button>
      </form>
    </section>
  );
}
