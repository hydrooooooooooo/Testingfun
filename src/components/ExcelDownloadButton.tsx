
import React from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Pack } from "@/lib/plans";

type Props = {
  disabled?: boolean;
  pack: Pack;
  onDownload?: () => void;
  onPaywall?: () => void;
};

export default function ExcelDownloadButton({ disabled, pack, onDownload, onPaywall }: Props) {
  const handleDownload = () => {
    if (disabled) {
      if (onPaywall) onPaywall();
      return;
    }
    // Génère un faux fichier Excel pour la démo
    const csvContent = [
      ["Titre", "Prix", "Description", "Ville"],
      ...Array.from({ length: pack.nbDownloads }).map((_, i) => [
        `Produit démo ${i + 1}`,
        `${500 + 80 * i} €`,
        `Description générique #${i + 1}`,
        ["Antananarivo", "Paris", "Lyon", "Marseille"][i % 4] || "Antananarivo",
      ])
    ]
    .map(row => row.join(";"))
    .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export_annonces_${pack.nbDownloads}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 400);
    toast({
      title: "Export réussi !",
      description: `Votre fichier Excel (${pack.nbDownloads} annonces) a été téléchargé.`,
      variant: "default",
    });
    if (onDownload) onDownload();
  };

  return (
    <Button 
      className="w-full font-bold text-lg gap-2 mt-3 bg-gradient-to-r from-green-400 to-navy-500" 
      onClick={handleDownload} 
      disabled={false}
      type="button"
    >
      <FileDown className="w-5 h-5" /> Télécharger Excel : {pack.nbDownloads} annonces – {pack.priceLabel}
    </Button>
  );
}

