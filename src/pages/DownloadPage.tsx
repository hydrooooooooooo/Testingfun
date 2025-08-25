import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { PLANS } from "@/lib/plans";
import { toast } from "@/hooks/use-toast";
import { FileDown, Loader2, CheckCircle, ArrowLeft, Download, Mail, RotateCcw, Home } from "lucide-react";
import api from "@/services/api";

export default function DownloadPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const search = new URLSearchParams(location.search);

  const sessionId = search.get("session_id") || search.get("client_reference_id");
  const autoDownload = search.get("autoDownload") === "true";

  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [downloadToken, setDownloadToken] = useState<string | null>(null);
  const [pack, setPack] = useState(PLANS[0]);
  const [error, setError] = useState("");
  const [downloadHistory, setDownloadHistory] = useState<{format: string, timestamp: string}[]>([]);
  const [autoDownloadTriggered, setAutoDownloadTriggered] = useState(false);

  const verifyPayment = useCallback(async () => {
    if (!sessionId) {
      setError("Aucun identifiant de session trouvé.");
      setIsVerifying(false);
      return;
    }
    setIsVerifying(true);
    setError('');
    try {
      const response = await api.get(`/payment/verify-payment`, {
        params: { sessionId },
      });
      if (response.data.isPaid) {
        setPaymentVerified(true);
        const foundPack = PLANS.find(p => p.id === response.data.packId) || PLANS[0];
        setPack(foundPack);
        if (response.data.downloadToken) {
          setDownloadToken(response.data.downloadToken);
        }
      } else {
        setError("Le paiement n'a pas encore été confirmé.");
      }
    } catch (err) {
      setError("Une erreur est survenue lors de la vérification du paiement.");
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  }, [sessionId]);

  useEffect(() => {
    verifyPayment();
  }, [verifyPayment]);

  const handleDownload = async (format = 'excel') => {
    if (!sessionId) {
      toast({ title: "Erreur", description: "Aucun identifiant de session trouvé", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const response = await api.get(`/sessions/${sessionId}/download`, {
        params: { format, token: downloadToken, pack_id: pack.id },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const contentDisposition = response.headers['content-disposition'];
      let filename = `session-${sessionId}.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch && filenameMatch.length > 1) filename = filenameMatch[1];
      }
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast({ title: "Téléchargement réussi", description: `Le fichier ${filename} a été téléchargé.` });
      const newDownload = { format: format.toUpperCase(), timestamp: new Date().toLocaleTimeString('fr-FR') };
      setDownloadHistory(prev => [...prev, newDownload]);
    } catch (error) {
      console.error(`Erreur lors du téléchargement du fichier ${format}:`, error);
      toast({ title: "Erreur de téléchargement", description: `Impossible de télécharger le fichier. Veuillez réessayer.`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (autoDownload && paymentVerified && !isLoading && !autoDownloadTriggered) {
      setAutoDownloadTriggered(true);
      const timer = setTimeout(() => {
        handleDownload('excel');
        toast({ title: "Téléchargement automatique", description: "Votre fichier Excel est en cours de téléchargement.", variant: "default" });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoDownload, paymentVerified, isLoading, autoDownloadTriggered]);

  const handleReturnHome = () => navigate('/');
  const handleNewScraping = () => navigate('/');

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-lg font-semibold text-gray-700">Vérification du paiement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto text-center">
          <div className="rounded-xl border p-8 shadow-lg bg-white">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Erreur de vérification</h1>
            <p className="text-gray-600 mt-2 mb-6">{error}</p>
            <Button onClick={verifyPayment} disabled={isVerifying} className="w-full">
              {isVerifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
              Réessayer
            </Button>
            <Button variant="link" onClick={handleReturnHome} className="mt-4 text-gray-600">Retour à l'accueil</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!paymentVerified) {
    return null; // ou un fallback si nécessaire
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">Paiement réussi !</h1>
              <p className="mt-4 text-lg text-gray-600">Votre fichier est prêt à être téléchargé.</p>
            </div>
            <div className="rounded-2xl border p-8 shadow-lg bg-white/70 backdrop-blur-sm">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Détails de votre achat</h2>
                  <div className="mt-2 text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Pack :</span> {pack.name}</p>
                    <p><span className="font-medium">Session ID :</span> {sessionId}</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button onClick={() => handleDownload('excel')} disabled={isLoading} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 text-base">
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
                    Excel (.xlsx)
                  </Button>
                  <Button onClick={() => handleDownload('csv')} disabled={isLoading} variant="outline" className="flex-1 border-green-300 text-green-700 hover:bg-green-50 font-semibold py-3">
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    CSV (.csv)
                  </Button>
                </div>
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
            <div className="rounded-xl border p-6 shadow-lg bg-blue-50 border-blue-200">
              <div className="text-center space-y-4">
                <h2 className="text-xl font-semibold text-blue-900">Merci d'utiliser notre service ! 🎉</h2>
                <p className="text-blue-700">Nous espérons que nos données vous seront utiles pour vos projets.</p>
                <Button onClick={handleNewScraping} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                  <Home className="w-4 h-4 mr-2" />
                  Nouveau scraping
                </Button>
              </div>
            </div>
            <div className="rounded-xl border p-6 shadow-lg bg-gray-50 border-gray-200">
              <div className="text-center space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">Une question ou un problème ?</h3>
                <p className="text-gray-600 text-sm">En cas de réclamation, contactez notre support en mentionnant votre Session ID :</p>
                <p className="font-mono text-sm bg-white px-3 py-2 rounded border">{sessionId}</p>
                <a href={`mailto:support@easyscrapymg.com?subject=Réclamation - Session ${sessionId}`} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-sm">
                  <Mail className="w-4 h-4 mr-2" />
                  Contacter le support
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}