import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PLANS } from "@/lib/plans";
import { toast } from "@/hooks/use-toast";
import { FileDown, Loader2, CheckCircle, AlertCircle, RefreshCw, Home, Eye, AlertTriangle, Download, ArrowLeft } from "lucide-react";
import axios from "axios";
import ScrapePreview from "@/components/ScrapePreview";
import { useApi } from "@/hooks/useApi";

export default function DownloadPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const search = new URLSearchParams(location.search);
  
  // Récupérer les paramètres de l'URL avec priorité sur session_id
  const sessionId = search.get("session_id") || search.get("client_reference_id") || localStorage.getItem('lastSessionId');
  const packId = search.get("pack_id") || localStorage.getItem('lastPackId');
  const autoDownload = search.get("autoDownload") === "true";

  // Debug des paramètres reçus
  useEffect(() => {
    console.log('Paramètres URL reçus:', {
      sessionId,
      packId, 
      autoDownload,
      allParams: Object.fromEntries(search.entries())
    });
  }, [sessionId, packId, autoDownload]);
  
  // États pour gérer le chargement et les erreurs
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [pack, setPack] = useState(PLANS[0]);
  const [error, setError] = useState("");
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [downloadHistory, setDownloadHistory] = useState<{format: string, timestamp: string}[]>([]);
  const [autoDownloadTriggered, setAutoDownloadTriggered] = useState(false);
  const [downloadToken, setDownloadToken] = useState<string | null>(null);
  
  // Utiliser notre hook API
  const { getPreviewItems } = useApi();
  
  // Déclencher automatiquement le téléchargement APRÈS vérification
  useEffect(() => {
    if (autoDownload && paymentVerified && !autoDownloadTriggered && !isLoading) {
      console.log('Téléchargement automatique déclenché pour session:', sessionId);
      setAutoDownloadTriggered(true);
      
      const formatParam = search.get("format") || 'excel';
      
      const timer = setTimeout(() => {
        console.log('Lancement du téléchargement automatique');
        handleDownload(formatParam as 'excel' | 'csv');
        toast({
          title: "Téléchargement automatique",
          description: `Votre fichier ${formatParam.toUpperCase()} est en cours de téléchargement.`,
          variant: "default",
        });
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [paymentVerified, autoDownload, autoDownloadTriggered, isLoading, sessionId]);
  // Télécharger le fichier Excel ou CSV depuis l'API
  const handleDownload = async (format = 'excel') => {
    if (!sessionId) {
      toast({
        title: "Erreur",
        description: "Aucun identifiant de session trouvé",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log(`Tentative de téléchargement au format ${format} pour la session ${sessionId}`);
      
      // Méthode 1: Essayer avec Fetch API d'abord (plus simple et moins de problèmes CORS)
      try {
        // Construire l'URL avec le token de téléchargement si disponible
        let apiUrl = `${import.meta.env.VITE_API_URL}/api/export?sessionId=${sessionId}&session_id=${sessionId}&format=${format}&t=${Date.now()}`;
        
        // Ajouter le token de téléchargement s'il existe
        if (downloadToken) {
          apiUrl += `&token=${downloadToken}`;
          console.log(`Utilisation du token de téléchargement: ${downloadToken}`);
        }
        
        console.log(`Tentative avec Fetch API: ${apiUrl}`);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          mode: 'cors',
          cache: 'no-cache',
          headers: {
            'Accept': '*/*',
          }
        });
        
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        // Récupérer le blob
        const blob = await response.blob();
        
        // Créer un lien de téléchargement
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Déterminer le nom du fichier en fonction du format
        const extension = format === 'csv' ? 'csv' : 'xlsx';
        const filename = `marketplace_data_${sessionId}.${extension}`;
        a.download = filename;
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, 400);
        
        console.log(`Téléchargement réussi: ${filename}`);
        
        // Ajouter à l'historique des téléchargements
        setDownloadHistory(prev => [...prev, {
          format: format.toUpperCase(),
          timestamp: new Date().toLocaleString('fr-FR')
        }]);
        
        toast({
          title: "Export réussi !",
          description: `Votre fichier ${format.toUpperCase()} (${pack.nbDownloads} annonces) a été téléchargé.`,
          variant: "default",
        });
        
        return; // Succès, sortir de la fonction
      } catch (fetchError) {
        console.warn('Erreur avec Fetch API, tentative avec Axios:', fetchError);
      }
      
      // Méthode 2: Essayer avec Axios si Fetch a échoué
      try {
        // Créer une instance Axios avec une configuration spécifique pour éviter les problèmes CORS
        const downloadInstance = axios.create({
          baseURL: import.meta.env.VITE_API_URL,
          timeout: 60000, // 60 secondes de timeout
          responseType: 'blob',
          withCredentials: false,
          headers: {
            'Accept': '*/*'
          }
        });
        
        // Construire les paramètres pour la requête
        const params: Record<string, any> = {
          sessionId: sessionId,
          session_id: sessionId, // Ajouter également ce paramètre pour la compatibilité
          format: format,
          t: Date.now()
        };
        
        // Ajouter le token de téléchargement s'il existe
        if (downloadToken) {
          params.token = downloadToken;
          console.log(`Utilisation du token de téléchargement avec Axios: ${downloadToken}`);
        }
        
        console.log(`Téléchargement avec Axios et paramètres:`, params);
        
        const response = await downloadInstance.get(`/api/export`, { params });
        
        // Vérifier que nous avons bien reçu un blob
        if (response.data instanceof Blob) {
          // Créer un lien de téléchargement
          const url = URL.createObjectURL(new Blob([response.data]));
          const a = document.createElement('a');
          a.href = url;
          
          // Déterminer le nom du fichier en fonction du format
          const extension = format === 'csv' ? 'csv' : 'xlsx';
          const filename = `marketplace_data_${sessionId}.${extension}`;
          a.download = filename;
          
          document.body.appendChild(a);
          a.click();
          
          setTimeout(() => {
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
          }, 400);
          
          console.log(`Téléchargement réussi avec Axios: ${filename}`);
          
          // Ajouter à l'historique des téléchargements
          setDownloadHistory(prev => [...prev, {
            format: format.toUpperCase(),
            timestamp: new Date().toLocaleString('fr-FR')
          }]);
          
          toast({
            title: "Export réussi !",
            description: `Votre fichier ${format.toUpperCase()} (${pack.nbDownloads} annonces) a été téléchargé.`,
            variant: "default",
          });
          
          return; // Succès, sortir de la fonction
        } else {
          console.warn('La réponse n\'est pas un blob:', response);
          throw new Error('Format de réponse invalide');
        }
      } catch (axiosError) {
        console.warn('Erreur avec Axios, tentative avec window.open:', axiosError);
        throw axiosError; // Propager l'erreur pour le fallback
      }
    } catch (err) {
      console.error('Erreur lors du téléchargement, tentative de fallback:', err);
      
      // Méthode 3: Fallback ultime - Ouvrir dans un nouvel onglet
      try {
        // Construire l'URL avec le token de téléchargement si disponible
        let fallbackUrl = `${import.meta.env.VITE_API_URL}/api/export?sessionId=${sessionId}&session_id=${sessionId}&format=${format}&t=${Date.now()}`;
        
        // Ajouter le token de téléchargement s'il existe
        if (downloadToken) {
          fallbackUrl += `&token=${downloadToken}`;
          console.log(`Utilisation du token de téléchargement pour le fallback: ${downloadToken}`);
        }
        
        console.log(`Tentative de fallback avec window.open: ${fallbackUrl}`);
        
        const newTab = window.open(fallbackUrl, '_blank');
        
        if (newTab) {
          toast({
            title: "Téléchargement alternatif",
            description: `Le fichier ${format.toUpperCase()} s'ouvre dans un nouvel onglet. Si le téléchargement ne démarre pas automatiquement, vérifiez les bloqueurs de popups.`,
            variant: "default",
          });
          
          // Même en cas de fallback, on considère que c'est un succès pour l'historique
          setDownloadHistory(prev => [...prev, {
            format: format.toUpperCase() + ' (alt)',
            timestamp: new Date().toLocaleString('fr-FR')
          }]);
        } else {
          throw new Error('Le navigateur a bloqué l\'ouverture d\'un nouvel onglet');
        }
      } catch (fallbackError) {
        console.error('Échec de toutes les méthodes de téléchargement:', fallbackError);
        toast({
          title: "Erreur de téléchargement",
          description: "Impossible de télécharger le fichier après plusieurs tentatives. Veuillez réessayer ou contacter le support.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  // Vérifier le paiement au chargement de la page
  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setError("Aucun identifiant de session trouvé");
        setIsVerifying(false);
        return;
      }

      try {
        setIsVerifying(true);
        console.log('Vérification du paiement pour:', { sessionId, packId });
        
        // Créer une instance Axios avec une configuration spécifique pour éviter les problèmes CORS
        const axiosInstance = axios.create({
          baseURL: import.meta.env.VITE_API_URL,
          timeout: 10000,
          withCredentials: false
        });
        
        const response = await axiosInstance.get(`/api/verify-payment`, {
          params: { 
            sessionId,
            ...(packId && { packId })
          }
        });

        console.log('Réponse de vérification:', response.data);

        if (response.data.isPaid) {
          setPaymentVerified(true);
          
          const sessionPackId = response.data.packId || packId || 'pack-decouverte';
          const foundPack = PLANS.find(p => p.id === sessionPackId) || PLANS[0];
          setPack(foundPack);
          
          localStorage.setItem('lastSessionId', sessionId);
          localStorage.setItem('lastPackId', sessionPackId);
          
          fetchPreviewItems(sessionId);
        } else {
          setError("Le paiement n'a pas encore été confirmé.");
        }
      } catch (err) {
        console.error('Erreur lors de la vérification du paiement:', err);
        setError("Erreur lors de la vérification du paiement.");
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId, packId]);
  // Récupérer les éléments de prévisualisation
  const fetchPreviewItems = async (sid: string) => {
    setIsLoadingPreview(true);
    console.log(`Récupération des éléments de prévisualisation pour la session ${sid}`);
    
    // Vérifier si c'est une session temporaire
    const isTemporarySession = sid.startsWith('temp_');
    
    try {
      // Essayer d'abord avec le hook useApi
      try {
        const result = await getPreviewItems(sid);
        console.log('Données de prévisualisation reçues via hook:', result);
        
        if (result && result.previewItems && Array.isArray(result.previewItems)) {
          setPreviewItems(result.previewItems);
          console.log(`${result.previewItems.length} éléments de prévisualisation chargés`);
          setIsLoadingPreview(false);
          return;
        } else {
          console.warn('Format de réponse invalide, tentative avec appel direct');
          throw new Error('Format de réponse invalide');
        }
      } catch (hookError) {
        console.warn('Erreur avec le hook useApi, tentative avec appel direct:', hookError);
        
        // Fallback: appel direct à l'API
        const directResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/preview`, {
          params: { sessionId: sid },
          timeout: 15000 // 15 secondes de timeout
        });
        
        console.log('Réponse directe de l\'API:', directResponse.data);
        
        if (directResponse.data && directResponse.data.previewItems && Array.isArray(directResponse.data.previewItems)) {
          setPreviewItems(directResponse.data.previewItems);
          console.log(`${directResponse.data.previewItems.length} éléments de prévisualisation chargés via appel direct`);
        } else if (isTemporarySession) {
          // Pour les sessions temporaires, générer des données de démonstration
          console.log('Génération de données de démonstration pour session temporaire');
          const demoItems = generateDemoItems();
          setPreviewItems(demoItems);
        } else {
          console.warn('Aucun élément de prévisualisation trouvé dans la réponse directe');
          setPreviewItems([]);
        }
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des éléments de prévisualisation:', err);
      
      if (isTemporarySession) {
        // Pour les sessions temporaires, générer des données de démonstration en cas d'erreur
        console.log('Génération de données de démonstration après erreur');
        const demoItems = generateDemoItems();
        setPreviewItems(demoItems);
      } else {
        setPreviewItems([]);
      }
    } finally {
      setIsLoadingPreview(false);
    }
  };
  
  // Générer des données de démonstration pour les sessions temporaires
  const generateDemoItems = () => {
    return [
      {
        title: "Appartement T3 avec balcon",
        price: "950 €",
        location: "Lyon 3ème",
        area: "65 m²",
        description: "Bel appartement lumineux avec balcon, proche des transports",
        imageUrl: "https://picsum.photos/seed/apt1/300/200"
      },
      {
        title: "Studio meublé centre-ville",
        price: "580 €",
        location: "Paris 11ème",
        area: "28 m²",
        description: "Studio entièrement rénové et meublé, idéal étudiant",
        imageUrl: "https://picsum.photos/seed/apt2/300/200"
      },
      {
        title: "Maison 4 pièces avec jardin",
        price: "1 250 €",
        location: "Toulouse",
        area: "95 m²",
        description: "Maison familiale avec jardin dans quartier calme et résidentiel",
        imageUrl: "https://picsum.photos/seed/apt3/300/200"
      }
    ];
  };
  // Rendu du composant
  return (
    <Layout>
      <section className="container max-w-5xl py-8 px-4 sm:px-6">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
        
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📥 Téléchargement de vos données
          </h1>
          <p className="text-gray-600">
            Votre paiement a été confirmé. Téléchargez vos {pack.nbDownloads} annonces au format Excel ou CSV.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Section principale de téléchargement */}
          <div className="space-y-6">
            <div className={`rounded-xl border p-6 shadow-lg ${isVerifying ? 'bg-blue-50 border-blue-200' : error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              {isVerifying ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <p className="text-md text-muted-foreground">Vérification du paiement en cours...</p>
                  <p className="text-sm text-muted-foreground">Session ID: <span className="font-mono text-xs bg-white px-2 py-1 rounded">{sessionId}</span></p>
                </div>
              ) : error ? (
                <>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                    <h2 className="text-2xl font-extrabold text-red-600 text-center">Erreur</h2>
                  </div>
                  <p className="text-md text-muted-foreground text-center mb-4">{error}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => window.location.reload()}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Réessayer
                    </Button>
                    <Link to="/" className="flex items-center gap-1 text-blue-600 font-semibold hover:underline">
                      <Home className="h-4 w-4" />
                      Accueil
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <h2 className="text-2xl font-extrabold text-green-700 text-center">Paiement confirmé !</h2>
                  </div>
                  <div className="text-center mb-6">
                    <p className="text-md text-muted-foreground">Votre session est active et vos données sont prêtes.</p>
                    <p className="text-sm text-muted-foreground mt-1">Session ID: <span className="font-mono text-xs bg-white px-2 py-1 rounded">{sessionId}</span></p>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    <Button 
                      onClick={() => handleDownload('excel')} 
                      disabled={isLoading} 
                      className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                      Télécharger en Excel ({pack.nbDownloads} annonces)
                    </Button>
                    
                    <Button 
                      onClick={() => handleDownload('csv')} 
                      disabled={isLoading} 
                      variant="outline" 
                      className="w-full flex items-center justify-center gap-2"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Télécharger en CSV ({pack.nbDownloads} annonces)
                    </Button>
                  </div>
                </>
              )}
            </div>
            
            {/* Historique des téléchargements */}
            {downloadHistory.length > 0 && (
              <div className="bg-white rounded-xl border p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Téléchargements effectués</h3>
                </div>
                <ul className="space-y-2">
                  {downloadHistory.map((item, index) => (
                    <li key={index} className="text-sm flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">{item.format}</span>
                      <span className="text-gray-600">{item.timestamp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Section de prévisualisation */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Aperçu des données</h3>
                </div>
                
                {isLoadingPreview ? (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <p className="text-sm text-muted-foreground">Chargement de la prévisualisation...</p>
                  </div>
                ) : previewItems && previewItems.length > 0 ? (
                  <>
                    <ScrapePreview items={previewItems.slice(0, 3)} />
                    <p className="text-xs text-center text-muted-foreground mt-3">
                      Aperçu de {previewItems.slice(0, 3).length} éléments sur {pack.nbDownloads} disponibles
                    </p>
                  </>
                ) : (
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-center">
                    <AlertTriangle className="h-5 w-5 mx-auto mb-2 text-amber-600" />
                    <p className="text-sm text-amber-700">Aucun élément de prévisualisation disponible</p>
                    <p className="text-xs text-amber-600 mt-1">Vous pouvez tout de même télécharger vos données</p>
                  </div>
                )}
              </div>

              {/* Bannière de téléchargement automatique */}
              {autoDownload && autoDownloadTriggered && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200 mb-4 animate-pulse">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h4 className="font-semibold text-green-800">Téléchargement automatique en cours</h4>
                  </div>
                  <p className="text-sm text-green-700 mt-1 pl-7">
                    Suite à votre paiement réussi, votre fichier Excel est en cours de téléchargement.
                  </p>
                </div>
              )}
              
              {/* Informations supplémentaires */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">💡 Conseils d'utilisation</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Les fichiers Excel sont optimisés pour l'analyse</li>
                  <li>• Les fichiers CSV sont compatibles avec tous les logiciels</li>
                  <li>• Vous pouvez télécharger plusieurs fois le même format</li>
                  <li>• Vos données restent disponibles pendant 30 jours</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:underline">
            <Home className="h-4 w-4" />
            Retour à l'accueil
          </Link>
        </div>
      </section>
    </Layout>
  );
}
