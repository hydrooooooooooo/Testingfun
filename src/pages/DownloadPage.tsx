import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PLANS } from "@/lib/plans";
import { toast } from "@/hooks/use-toast";
import { FileDown, Loader2, CheckCircle, ArrowLeft, Download, Mail, RotateCcw, Home } from "lucide-react";
import axios from "axios";
import { useApi } from "@/hooks/useApi";

export default function DownloadPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const search = new URLSearchParams(location.search);
  
  // Récupérer les paramètres de l'URL
  const sessionId = search.get("session_id") || search.get("client_reference_id");
  const packId = search.get("pack_id");
  const autoDownload = search.get("autoDownload") === "true";
  
  // États pour gérer le chargement et les erreurs
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [pack, setPack] = useState(PLANS[0]);
  const [error, setError] = useState("");
  const [downloadHistory, setDownloadHistory] = useState<{format: string, timestamp: string}[]>([]);
  const [autoDownloadTriggered, setAutoDownloadTriggered] = useState(false);
  
  // Utiliser notre hook API
  const { } = useApi();
  
  // Déclencher automatiquement le téléchargement si autoDownload est présent
  useEffect(() => {
    if (autoDownload && paymentVerified && !isLoading && !autoDownloadTriggered) {
      console.log('Téléchargement automatique déclenché');
      setAutoDownloadTriggered(true);
      
      const timer = setTimeout(() => {
        handleDownload('excel');
        toast({
          title: "Téléchargement automatique",
          description: "Votre fichier Excel est en cours de téléchargement suite à votre paiement réussi.",
          variant: "default",
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [autoDownload, paymentVerified, isLoading, autoDownloadTriggered]);
  
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
      
      const downloadInstance = axios.create({
        baseURL: import.meta.env.VITE_API_URL,
        timeout: 30000,
        responseType: 'blob',
        withCredentials: false,
        headers: {
          'Accept': '*/*',
          'Content-Type': 'application/json'
        }
      });
      
      const params = {
        sessionId: sessionId,
        session_id: sessionId,
        format: format,
        t: Date.now()
      };
      
      console.log(`Téléchargement avec paramètres:`, params);
      
      try {
        const response = await downloadInstance.get(`/api/export`, { params });
        
        if (response.data instanceof Blob) {
          const url = URL.createObjectURL(new Blob([response.data]));
          const a = document.createElement('a');
          a.href = url;
          
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
          
          setDownloadHistory(prev => [...prev, {
            format: format.toUpperCase(),
            timestamp: new Date().toLocaleString('fr-FR')
          }]);
          
          toast({
            title: "Export réussi !",
            description: `Votre fichier ${format.toUpperCase()} (${pack.nbDownloads} annonces) a été téléchargé.`,
            variant: "default",
          });
          
          return;
        } else {
          console.warn('La réponse n\'est pas un blob:', response);
          throw new Error('Format de réponse invalide');
        }
      } catch (axiosError) {
        console.warn('Erreur avec la méthode axios, tentative avec la méthode window.open:', axiosError);
        
        const fallbackUrl = `${import.meta.env.VITE_API_URL}/api/export?sessionId=${sessionId}&session_id=${sessionId}&format=${format}&t=${Date.now()}`;
        const newTab = window.open(fallbackUrl, '_blank');
        
        if (newTab) {
          toast({
            title: "Téléchargement en cours",
            description: `Le fichier ${format.toUpperCase()} s'ouvre dans un nouvel onglet.`,
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

  const handleReturnHome = () => {
    navigate('/');
  };

  const handleNewScraping = () => {
    navigate('/');
  };

  if (isVerifying) {
    return (
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-md text-muted-foreground">Vérification du paiement en cours...</p>
            <p className="text-sm text-muted-foreground">Session ID: <span className="font-mono text-xs bg-white px-2 py-1 rounded">{sessionId}</span></p>
          </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Button
              variant="ghost"
              onClick={handleReturnHome}
              className="mb-6 hover:bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            
            <div className="rounded-xl border p-6 shadow-lg bg-red-50 border-red-200">
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-red-900">Erreur de vérification</h1>
                <p className="text-red-700 text-center">{error}</p>
                <Button onClick={() => window.location.reload()} className="mt-4">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Réessayer
                </Button>
              </div>
            </div>
          </div>
        </div>
    );
  }

  return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* En-tête avec bouton retour */}
          <div className="flex flex-col gap-4 mb-8">
            <Button
              variant="ghost"
              onClick={handleReturnHome}
              className="self-start hover:bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                📥 Téléchargement de vos données
              </h1>
              <p className="text-gray-600 mb-2">
                <strong>Paiement confirmé !</strong>
              </p>
              <p className="text-gray-600">
                Votre session est active et vos données sont prêtes.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Session ID: <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{sessionId}</span>
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-1 gap-8 max-w-2xl mx-auto">
            {/* Section principale de téléchargement */}
            <div className="space-y-6">
              <div className="rounded-xl border p-6 shadow-lg bg-green-50 border-green-200">
                <div className="flex flex-col items-center gap-6">
                  <div className="text-center">
                    <h2 className="text-xl font-semibold text-green-900 mb-2">
                      Téléchargement disponible
                    </h2>
                    <p className="text-green-700">
                      Téléchargez vos {pack.nbDownloads} annonces au format Excel ou CSV.
                    </p>
                  </div>
                  
                  {/* Boutons de téléchargement */}
                  <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                    <Button
                      onClick={() => handleDownload('excel')}
                      disabled={isLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <FileDown className="w-4 h-4 mr-2" />
                      )}
                      Excel (.xlsx)
                    </Button>
                    
                    <Button
                      onClick={() => handleDownload('csv')}
                      disabled={isLoading}
                      variant="outline"
                      className="flex-1 border-green-300 text-green-700 hover:bg-green-50 font-semibold py-3"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      CSV (.csv)
                    </Button>
                  </div>
                  
                  {/* Historique des téléchargements */}
                  {downloadHistory.length > 0 && (
                    <div className="w-full mt-4">
                      <h3 className="text-sm font-semibold text-green-800 mb-2">Téléchargements effectués :</h3>
                      <div className="space-y-1">
                        {downloadHistory.map((download, index) => (
                          <div key={index} className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                            {download.format} - {download.timestamp}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Section de remerciement et invitation */}
              <div className="rounded-xl border p-6 shadow-lg bg-blue-50 border-blue-200">
                <div className="text-center space-y-4">
                  <h2 className="text-xl font-semibold text-blue-900">
                    Merci d'utiliser notre service ! 🎉
                  </h2>
                  <p className="text-blue-700">
                    Nous espérons que nos données vous seront utiles pour vos projets.
                    N'hésitez pas à revenir pour un nouveau scraping quand vous en aurez besoin.
                  </p>
                  
                  <Button
                    onClick={handleNewScraping}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Nouveau scraping
                  </Button>
                </div>
              </div>

              {/* Section support */}
              <div className="rounded-xl border p-6 shadow-lg bg-gray-50 border-gray-200">
                <div className="text-center space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Une question ou un problème ?
                  </h3>
                  <p className="text-gray-600 text-sm">
                    En cas de réclamation, contactez notre support en mentionnant votre Session ID de référence :
                  </p>
                  <p className="font-mono text-sm bg-white px-3 py-2 rounded border">
                    {sessionId}
                  </p>
                  
                  <a
                    href={`mailto:support@easyscrapymg.com?subject=Réclamation - Session ${sessionId}&body=Bonjour,%0A%0AJe souhaite signaler un problème concernant ma session de scraping.%0A%0ASession ID: ${sessionId}%0A%0ADescription du problème:%0A%0A%0AMerci de votre aide.`}
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-sm"
                  >
                    <Mail className="w-4 h-4" />
                    support@easyscrapymg.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}