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
  
  // Récupérer les paramètres de l'URL
  const sessionId = search.get("session_id") || search.get("client_reference_id");
  const packId = search.get("pack_id");
  
  // États pour gérer le chargement et les erreurs
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [pack, setPack] = useState(PLANS[0]);
  const [error, setError] = useState("");
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [downloadHistory, setDownloadHistory] = useState<{format: string, timestamp: string}[]>([]);
  
  // Utiliser notre hook API
  const { getPreviewItems } = useApi();
  
  // Vérifier le paiement au chargement de la page
  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setError("Aucun identifiant de session trouvé");
        setIsVerifying(false);
        return;
      }
      
      // Si c'est une session temporaire, on la considère automatiquement comme payée
      if (sessionId.startsWith('temp_')) {
        console.log('Session temporaire détectée, considérée comme payée:', sessionId);
        setPaymentVerified(true);
        
        // Trouver le pack correspondant
        const sessionPackId = packId || 'pack-decouverte';
        const foundPack = PLANS.find(p => p.id === sessionPackId) || PLANS[0];
        setPack(foundPack);
        
        // Stocker la session ID dans le localStorage pour référence future
        localStorage.setItem('lastSessionId', sessionId);
        localStorage.setItem('lastPackId', sessionPackId);
        
        // Récupérer les éléments de prévisualisation
        fetchPreviewItems(sessionId);
        setIsVerifying(false);
        return;
      }
      
      try {
        // Essayer d'abord avec la route spécifique
        try {
          console.log(`Vérification du paiement pour la session ${sessionId}`);
          const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/payment/verify-payment`, {
            params: { sessionId },
            timeout: 10000 // 10 secondes de timeout
          });
          
          console.log('Réponse de vérification:', response.data);
          
          if (response.data.isPaid) {
            setPaymentVerified(true);
            
            // Trouver le pack correspondant
            const sessionPackId = response.data.packId || packId || 'pack-decouverte';
            const foundPack = PLANS.find(p => p.id === sessionPackId) || PLANS[0];
            setPack(foundPack);
            
            // Stocker la session ID dans le localStorage pour référence future
            localStorage.setItem('lastSessionId', sessionId);
            localStorage.setItem('lastPackId', sessionPackId);
            
            // Récupérer les éléments de prévisualisation
            fetchPreviewItems(sessionId);
          } else {
            setError("Le paiement n'a pas encore été confirmé. Veuillez réessayer dans quelques instants.");
          }
        } catch (apiError) {
          console.warn('Erreur avec la route spécifique, essai avec la route générique:', apiError);
          
          // Fallback sur l'ancienne route
          const fallbackResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/verify-payment`, {
            params: { sessionId },
            timeout: 10000 // 10 secondes de timeout
          });
          
          if (fallbackResponse.data.isPaid) {
            setPaymentVerified(true);
            
            // Trouver le pack correspondant
            const sessionPackId = fallbackResponse.data.packId || packId || 'pack-decouverte';
            const foundPack = PLANS.find(p => p.id === sessionPackId) || PLANS[0];
            setPack(foundPack);
            
            // Stocker la session ID dans le localStorage pour référence future
            localStorage.setItem('lastSessionId', sessionId);
            localStorage.setItem('lastPackId', sessionPackId);
            
            // Récupérer les éléments de prévisualisation
            fetchPreviewItems(sessionId);
          } else {
            setError("Le paiement n'a pas encore été confirmé. Veuillez réessayer dans quelques instants.");
          }
        }
      } catch (err) {
        console.error('Erreur lors de la vérification du paiement:', err);
        setError("Erreur lors de la vérification du paiement. Veuillez réessayer ou contacter le support.");
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
        toast({
          title: "Erreur de prévisualisation",
          description: "Impossible de charger les éléments de prévisualisation. Les données restent disponibles au téléchargement.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoadingPreview(false);
    }
  };
  
  // Générer des données de démonstration pour les sessions temporaires
  const generateDemoItems = () => {
    return [
      {
        title: "Appartement moderne 3 pièces",
        price: "850 €",
        desc: "Magnifique appartement rénové avec vue dégagée, proche des transports et commerces.",
        location: "Paris 11ème",
        url: "https://example.com/annonce1",
        image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400"
      },
      {
        title: "Studio meublé centre-ville",
        price: "650 €",
        desc: "Studio entièrement meublé, idéal étudiant ou jeune professionnel, charges comprises.",
        location: "Lyon 2ème",
        url: "https://example.com/annonce2",
        image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400"
      },
      {
        title: "Maison avec jardin 4 pièces",
        price: "1200 €",
        desc: "Belle maison avec jardin privatif, garage, proche écoles et parcs.",
        location: "Marseille 8ème",
        url: "https://example.com/annonce3",
        image: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400"
      }
    ];
  };
  
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
      
      // Construire l'URL avec tous les paramètres nécessaires
      const downloadUrl = `${import.meta.env.VITE_API_URL}/api/export?sessionId=${sessionId}&format=${format}&t=${Date.now()}`;
      console.log('URL de téléchargement:', downloadUrl);
      
      // Méthode 1: Téléchargement direct via axios
      try {
        // Appel à l'API pour télécharger le fichier
        const response = await axios.get(downloadUrl, { 
          responseType: 'blob',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          timeout: 30000 // 30 secondes de timeout
        });
        
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
          
          setIsLoading(false);
          return;
        } else {
          console.warn('La réponse n\'est pas un blob:', response);
          throw new Error('Format de réponse invalide');
        }
      } catch (axiosError) {
        console.warn('Erreur avec la méthode axios, tentative avec la méthode window.open:', axiosError);
        
        // Méthode 2: Fallback - Ouvrir dans un nouvel onglet
        const newTab = window.open(downloadUrl, '_blank');
        
        if (newTab) {
          toast({
            title: "Téléchargement en cours",
            description: `Le fichier ${format.toUpperCase()} s'ouvre dans un nouvel onglet. Si le téléchargement ne démarre pas automatiquement, vérifiez les bloqueurs de popups.`,
            variant: "default",
          });
        } else {
          throw new Error('Le navigateur a bloqué l\'ouverture d\'un nouvel onglet');
        }
      }
    } catch (err) {
      console.error('Erreur lors du téléchargement:', err);
      toast({
        title: "Erreur de téléchargement",
        description: "Impossible de télécharger le fichier. Veuillez réessayer ou contacter le support.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <section className="mx-auto w-full max-w-4xl my-10 px-4">
        {/* Header avec navigation */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-800"
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
                    <p className="text-md text-muted-foreground mb-2">
                      Pack acheté : <b>{pack.name}</b>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Session ID: <span className="font-mono text-xs bg-white px-2 py-1 rounded">{sessionId}</span>
                    </p>
                  </div>
                  
                  <div className="w-full flex flex-col gap-3">
                    <Button 
                      className="w-full font-bold text-lg gap-2 bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800"
                      onClick={() => handleDownload('excel')}
                      disabled={isLoading}
                      type="button"
                    >
                      {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <FileDown className="w-5 h-5" />}
                      📊 Télécharger Excel ({pack.nbDownloads} annonces)
                    </Button>
                    <Button 
                      className="w-full font-bold text-lg gap-2 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800"
                      onClick={() => handleDownload('csv')}
                      disabled={isLoading}
                      type="button"
                    >
                      {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <FileDown className="w-5 h-5" />}
                      📄 Télécharger CSV ({pack.nbDownloads} annonces)
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Historique des téléchargements */}
            {downloadHistory.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Historique des téléchargements
                </h3>
                <div className="space-y-2">
                  {downloadHistory.map((download, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Fichier {download.format}</span>
                      <span className="text-gray-500">{download.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

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