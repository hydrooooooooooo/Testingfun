
import Layout from "@/components/Layout";
import ScrapePreview from "@/components/ScrapePreview";
import ScrapeProgress from "@/components/ScrapeProgress";
import ExcelDownloadButton from "@/components/ExcelDownloadButton";
import ScrapeSupportInfo from "@/components/ScrapeSupportInfo";
import HeroHeader from "@/components/HeroHeader";
import InstructionsCard from "@/components/InstructionsCard";
import ScrapeForm from "@/components/ScrapeForm";
import SelectedPackInfos from "@/components/SelectedPackInfos";
import ScrapeResultSection from "@/components/ScrapeResultSection";
import React from "react";
import { useScrape } from "@/hooks/useScrape";
import { PLANS, Pack } from "@/lib/plans";

// Ajout Google Fonts (Inter)
if (typeof document !== "undefined" && !document.getElementById("google-inter")) {
  const link = document.createElement("link");
  link.id = "google-inter";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Playfair+Display:wght@700&display=swap";
  document.head.appendChild(link);
}

// Les données de démonstration ont été supprimées car nous utilisons maintenant les données réelles extraites

export default function Index() {
  const {
    url, setUrl,
    loading,
    showPreview,
    scrapePercent,
    scrapeDone,
    sessionId,
    datasetId,
    stats,
    hasPaid,
    selectedPackId,
    setSelectedPackId,
    selectedPack,
    previewItems, // Récupération des previewItems depuis le hook useScrape
    handleScrape
  } = useScrape();

  return (
    <Layout>
      <div className="flex flex-col items-center min-h-[90vh] w-full">
        <HeroHeader />
        <div className="w-full flex flex-col gap-2 md:gap-4">
          <InstructionsCard />
          <ScrapeForm
            url={url}
            setUrl={setUrl}
            loading={loading}
            selectedPackId={selectedPackId}
            setSelectedPackId={setSelectedPackId}
            selectedPack={selectedPack}
            onScrape={handleScrape}
          />
          <SelectedPackInfos selectedPack={selectedPack} />
          {loading && (
            <ScrapeProgress 
              percent={scrapePercent} 
              stepLabel={
                scrapePercent < 100
                  ? "Analyse des annonces en cours…"
                  : "Scraping terminé"
              }
            />
          )}
          <ScrapeResultSection
            showPreview={showPreview}
            scrapeDone={scrapeDone}
            hasPaid={hasPaid}
            selectedPack={selectedPack}
            sessionId={sessionId}
            datasetId={datasetId}
            stats={stats}
            previewItems={previewItems} // Passage des previewItems en tant que prop distincte
          />
        </div>
      </div>
    </Layout>
  );
}
