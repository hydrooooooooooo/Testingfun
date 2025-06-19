import React, { useEffect, useState } from "react";
import ScrapePreview from "@/components/ScrapePreview";
import ExcelDownloadButton from "@/components/ExcelDownloadButton";
import ScrapeSupportInfo from "@/components/ScrapeSupportInfo";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Pack } from "@/lib/plans";
import { toast } from "@/hooks/use-toast";
import { useApi } from "@/hooks/useApi";
import axios from "axios";

type ScrapeResultSectionProps = {
  showPreview: boolean;
  scrapeDone: boolean;
  hasPaid: boolean;
  selectedPack: Pack;
  sessionId: string;
  datasetId: string;
  stats: { nbItems: number; startedAt: string; finishedAt?: string; previewItems?: any[] } | null;
};

type ListingItem = {
  title: string;
  price: string;
  desc: string;
  image: string;
  location: string;
  url?: string;
  postedAt?: string;
};

export default function ScrapeResultSection({
  showPreview,
  scrapeDone,
  hasPaid,
  selectedPack,
  sessionId,
  datasetId,
  stats,
  previewItems: propPreviewItems, // Ajout des previewItems comme prop distincte
}: ScrapeResultSectionProps & { previewItems?: any[] }) { // Extension du type pour inclure previewItems
  const navigate = useNavigate();
  const [completeItems, setCompleteItems] = useState<any[]>([]);
  const [isLoadingCompleteItems, setIsLoadingCompleteItems] = useState(false);
  
  // Utiliser l'API hook pour le paiement
  const { createPayment } = useApi();
  
  // Ajouter un log pour débugger
  console.log('ScrapeResultSection rendu avec:', { 
    showPreview, 
    scrapeDone, 
    hasPaid, 
    sessionId, 
    datasetId, 
    stats: stats ? `${stats.nbItems} items, ${stats.previewItems?.length || 0} preview items` : 'null',
    propPreviewItems: propPreviewItems ? `${propPreviewItems.length} items` : 'null'
  });
  
  // Récupérer les données complètes depuis le fichier de backup si disponible
  useEffect(() => {
    const fetchCompleteItems = async () => {
      if (!sessionId) return;
      
      try {
        setIsLoadingCompleteItems(true);
        console.log(`Tentative de récupération des données complètes pour la session ${sessionId}`);
        
        // Essayer de récupérer le fichier de backup depuis le backend
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/backup/${sessionId}`);
        
        if (response.data && response.data.allItems && Array.isArray(response.data.allItems)) {
          console.log(`Données complètes récupérées: ${response.data.allItems.length} items`);
          setCompleteItems(response.data.allItems);
        } else {
          console.log('Aucune donnée complète trouvée dans la réponse');
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des données complètes:', error);
      } finally {
        setIsLoadingCompleteItems(false);
      }
    };
    
    fetchCompleteItems();
  }, [sessionId]);

  // FONCTION DE PAIEMENT CORRIGÉE - utilise uniquement l'API backend
  const handlePay = async () => {
    if (!sessionId) {
      toast({
        title: "Session manquante",
        description: "Impossible de procéder au paiement sans identifiant de session.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Utiliser l'API backend au lieu du lien direct
      const checkoutUrl = await createPayment(selectedPack.id, sessionId);
      console.log('URL de paiement créée via API:', checkoutUrl);
      
      // Ouvrir dans la même fenêtre pour la redirection automatique
      window.location.href = checkoutUrl;
      
    } catch (error) {
      console.error('Error creating payment:', error);
      toast({
        title: "Erreur de paiement",
        description: "Une erreur est survenue lors de la création du paiement. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  // Logs détaillés pour le débogage
  console.log('ScrapeResultSection: Évaluation des conditions d\'affichage');
  console.log('showPreview:', showPreview, 'scrapeDone:', scrapeDone);
  console.log('stats:', stats);
  console.log('propPreviewItems disponibles:', propPreviewItems?.length || 0);
  
  // Afficher si le scraping est terminé ou si showPreview est activé
  const shouldDisplay = showPreview || scrapeDone;
  
  if (!shouldDisplay) {
    console.log('ScrapeResultSection: Conditions d\'affichage non remplies, ne rien afficher');
    return null;
  }
  
  console.log('ScrapeResultSection: Affichage de la section de résultat');
  
  // Extraire les éléments de prévisualisation de manière sécurisée
  // Vérifier d'abord dans propPreviewItems, puis dans stats.previewItems, puis dans stats directement si c'est un tableau
  let previewItems = [];
  
  // Afficher toutes les données disponibles pour le débogage
  console.log('DEBUG - propPreviewItems:', propPreviewItems);
  console.log('DEBUG - stats:', stats);
  
  // 1. Priorité aux previewItems passés en prop
  if (propPreviewItems && Array.isArray(propPreviewItems)) {
    previewItems = propPreviewItems;
    console.log(`ScrapeResultSection: ${previewItems.length} éléments de prévisualisation trouvés dans propPreviewItems`);
  } 
  // 2. Sinon, chercher dans stats.previewItems
  else if (stats?.previewItems && Array.isArray(stats.previewItems)) {
    previewItems = stats.previewItems;
    console.log(`ScrapeResultSection: ${previewItems.length} éléments de prévisualisation trouvés dans stats.previewItems`);
  } 
  // 3. Sinon, vérifier si stats est directement un tableau
  else if (Array.isArray(stats)) {
    previewItems = stats;
    console.log(`ScrapeResultSection: ${previewItems.length} éléments de prévisualisation trouvés directement dans stats`);
  }
  
  // Vérifier que les éléments ont les propriétés requises (validation plus permissive)
  const validPreviewItems = previewItems.filter(item => {
    // Afficher chaque élément pour le débogage
    console.log('DEBUG - Vérification de l\'élément:', item);
    // Validation plus permissive : on accepte les éléments qui ont au moins un titre et un prix
    // L'image n'est plus obligatoire car on gère les fallbacks dans ScrapePreview
    return item && typeof item === 'object' && 
           (item.title || item.name || item.marketplace_listing_title || item.custom_title) && // Accepter différentes formes de titre
           (item.price || item.prix || item.listing_price);   // Accepter différentes formes de prix
  });
  
  // Enrichir les données simplifiées avec les données complètes si disponibles
  const enrichedItems = validPreviewItems.map(simpleItem => {
    // Chercher l'item complet correspondant par URL ou ID
    const matchingCompleteItem = completeItems.find(completeItem => {
      // Correspondance par URL
      if (simpleItem.url && completeItem.listingUrl && simpleItem.url === completeItem.listingUrl) {
        return true;
      }
      // Correspondance par ID
      if (simpleItem.id && completeItem.id && simpleItem.id === completeItem.id) {
        return true;
      }
      // Correspondance par titre
      if (simpleItem.title && 
          (completeItem.marketplace_listing_title === simpleItem.title || 
           completeItem.custom_title === simpleItem.title)) {
        return true;
      }
      return false;
    });
    
    if (matchingCompleteItem) {
      console.log(`Item enrichi trouvé pour ${simpleItem.title || simpleItem.name}`);
      // Fusionner les données, en privilégiant les données complètes
      return { ...simpleItem, ...matchingCompleteItem };
    }
    
    return simpleItem;
  });
  
  console.log(`ScrapeResultSection: ${validPreviewItems.length} éléments de prévisualisation valides disponibles`);
  console.log('Premier élément valide:', validPreviewItems[0] || 'aucun');
  
  return (
    <>
      <div className="w-full flex flex-col items-center animate-fade-in">
        {/* Afficher la prévisualisation si disponible */}
        {validPreviewItems.length > 0 ? (
          <div className="w-full">
            {/* Afficher les éléments de prévisualisation s'ils sont disponibles */}
            <div className="w-full mt-4 bg-card rounded-xl p-6 border border-border shadow-sm">
              <h3 className="text-xl font-bold mb-4 tracking-tight">Aperçu des résultats</h3>
              {isLoadingCompleteItems ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2 text-muted-foreground">Chargement des données complètes...</span>
                </div>
              ) : (
                <ScrapePreview 
                  items={enrichedItems.length > 0 
                    ? enrichedItems.slice(0, Math.min(3, enrichedItems.length)) 
                    : validPreviewItems.slice(0, Math.min(3, validPreviewItems.length))} 
                />
              )}
            </div>
          </div>
        ) : (
          <div className="w-full p-6 bg-card rounded-xl border border-border shadow-sm text-center">
            <p className="text-muted-foreground">Aucun élément à afficher</p>
          </div>
        )}
        {/* Bloquer/afficher bouton d'export Excel selon hasPaid */}
        <div className="w-full max-w-lg">
          <ExcelDownloadButton 
            disabled={!scrapeDone || !hasPaid} 
            pack={selectedPack}
            onPaywall={handlePay}
          />
          {scrapeDone && !hasPaid && (
            <div className="mt-2 flex flex-col items-center">
              <Button
                variant="outline"
                className="w-full border border-blue-400 text-blue-600 font-semibold hover:bg-blue-50 transition-colors"
                onClick={handlePay}
              >
                🔓 Débloquer l'extraction Excel
              </Button>
              <span className="text-xs text-muted-foreground mt-1 font-sans">
                Accédez à tous les exports & fonctionnalités avancées après le paiement.
              </span>
            </div>
          )}
        </div>
        {sessionId && (
          <ScrapeSupportInfo
            sessionId={sessionId}
            datasetId={datasetId}
            stats={stats ? stats : undefined}
          />
        )}
      </div>
      {/* SECTION "PASSEZ PREMIUM" - Afficher uniquement si le scraping est terminé */}
      {scrapeDone && !hasPaid && (
        <div className="mt-8 w-full flex flex-col items-center animate-fade-in">
          <Button
            className="text-xl px-8 py-5 shadow-xl bg-gradient-to-r from-primary to-blue-600 text-white font-bold border-2 border-primary rounded-2xl transition hover:scale-110 hover:shadow-2xl duration-150"
            onClick={handlePay}
          >
            🔓 Débloquer & Exporter toutes les données ({selectedPack.nbDownloads} téléchargements)
          </Button>
          <span className="text-xs text-muted-foreground mt-2 font-sans">
            Paiement unique, téléchargement Excel instantané. Aucune inscription requise.
          </span>
        </div>
      )}
    </>
  );
}