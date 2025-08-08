import React from "react";
import ScrapePreview from "@/components/ScrapePreview";
import { Button } from "@/components/ui/button";
import { ScrapeStats, PreviewItem } from "@/hooks/useApi";
import { FileSpreadsheet, FileText, RotateCw, Unlock } from 'lucide-react';

interface ScrapeResultSectionProps {
  scrapeDone: boolean;
  isPaid: boolean;
  stats: ScrapeStats | null;
  propPreviewItems: PreviewItem[];
  onPayment: () => void;
  exportData: (format: 'excel' | 'csv') => void;
  resetScrape: () => void;
};

export default function ScrapeResultSection({
  scrapeDone,
  isPaid,
  stats,
  propPreviewItems,
  onPayment,
  exportData,
  resetScrape,
}: ScrapeResultSectionProps) {

  if (!scrapeDone) {
    return null;
  }

  const validPreviewItems = Array.isArray(propPreviewItems) ? propPreviewItems : [];

  return (
    <>
      <div className="w-full flex flex-col items-center animate-fade-in">
        {validPreviewItems.length > 0 && (
          <div className="w-full mt-4 bg-card rounded-xl p-6 border border-border shadow-sm">
            <h3 className="text-xl font-bold mb-4 tracking-tight">Aperçu des résultats</h3>
            <ScrapePreview items={validPreviewItems} />
          </div>
        )}
      </div>

      {scrapeDone && (
        <div className="w-full max-w-4xl p-6 mt-4 bg-card rounded-xl border border-border shadow-sm">
          {isPaid ? (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <h3 className="text-xl font-bold tracking-tight">Téléchargez vos résultats</h3>
                <p className="text-muted-foreground mt-1">
                  {stats?.nbItems ? `${stats.nbItems} éléments trouvés.` : 'Prêt pour le téléchargement.'}
                </p>
              </div>
              <div className="flex items-center gap-3 mt-4 md:mt-0">
                <Button onClick={() => exportData('excel')} className="bg-green-600 hover:bg-green-700">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel
                </Button>
                <Button onClick={() => exportData('csv')} className="bg-blue-600 hover:bg-blue-700">
                  <FileText className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button variant="outline" onClick={resetScrape}>
                  <RotateCw className="w-4 h-4 mr-2" />
                  Recommencer
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <h3 className="text-xl font-bold tracking-tight">Débloquez les résultats complets</h3>
                <p className="text-muted-foreground mt-1">
                  {stats?.nbItems ? `${stats.nbItems} éléments trouvés.` : 'Résultats disponibles.'} Payez pour débloquer.
                </p>
              </div>
              <div className="flex items-center gap-3 mt-4 md:mt-0">
                <Button onClick={onPayment} size="lg" className="bg-primary hover:bg-primary/90">
                  <Unlock className="w-4 h-4 mr-2" />
                  Débloquer maintenant
                </Button>
                <Button variant="outline" onClick={resetScrape}>
                  <RotateCw className="w-4 h-4 mr-2" />
                  Recommencer
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}