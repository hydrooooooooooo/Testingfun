import ScrapePreview from "@/components/ScrapePreview";
import ScrapeProgress from "@/components/ScrapeProgress";
import ExcelDownloadButton from "@/components/ExcelDownloadButton";
import ScrapeSupportInfo from "@/components/ScrapeSupportInfo";
import PaymentModal from "@/components/PaymentModal";
import ScrapeForm from "@/components/ScrapeForm";
import SelectedPackInfos from "@/components/SelectedPackInfos";
import ScrapeResultSection from "@/components/ScrapeResultSection";
import React, { useEffect } from "react";
import { useScrapeContext } from "@/contexts/ScrapeContext";
import { useSearchParams } from "react-router-dom";
import { Pack } from "@/lib/plans";
import { 
  Clock, 
  Database, 
  BarChart3, 
  Zap, 
  FileSpreadsheet, 
  Shield, 
  CheckCircle,
  ArrowRight,
  Users,
  Building,
  TrendingUp,
  Search,
  Download,
  Play,
  Store,
  Target,
  PieChart,
  Briefcase,
  Home,
  Car,
  ShoppingBag,
  MapPin,
  BarChart2,
  LineChart
} from "lucide-react";

// Ajout Google Fonts (Inter)
if (typeof document !== "undefined" && !document.getElementById("google-inter")) {
  const link = document.createElement("link");
  link.id = "google-inter";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
  document.head.appendChild(link);
}

export default function Index() {
  const [searchParams] = useSearchParams();
  const {
    loading,
    scrapeDone,
    isPaid,
    stats,
    previewItems,
    progress,
    resetScrape,
    status,
    startScrape,
    handlePayment,
    exportData,
    sessionId,
    isPaymentModalOpen,
    setPaymentModalOpen,
    paymentInfo,
    onStripePay,
    onMvolaPay,
    packs,
    selectedPackId,
    setSelectedPackId,
  } = useScrapeContext();

  const [url, setUrl] = React.useState("");



  // Scroll to form if coming from pricing page
  useEffect(() => {
    if (searchParams.get('packId')) {
      setTimeout(() => {
        document.getElementById('scraping-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [searchParams]);

  const selectedPack = React.useMemo(() => 
    packs.find(p => p.id === selectedPackId) || null,
    [selectedPackId, packs]
  );

  const handleScrape = React.useCallback((e: React.FormEvent, options: any) => {
    e.preventDefault();
    if (!selectedPackId) {
      console.error("No pack selected");
      return;
    }
    startScrape(url, { ...options, packId: selectedPackId });
  }, [url, startScrape, selectedPackId]);

  return (

      <div className="flex flex-col items-center min-h-screen w-full bg-gradient-to-b from-slate-50 to-white">
        
        {/* Hero Section */}
        <section className="w-full max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              Extraction automatisée de données marketplace
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
              Transformez vos recherches en
              <span className="block text-blue-600">données exploitables</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Extrayez instantanément les données de <strong>Facebook Marketplace</strong> et <strong>LinkedIn</strong> 
              en fichiers Excel structurés. Gagnez des heures d'analyse manuelle.
            </p>
          </div>

          {/* Scraping Form - Garde le même ID pour le scroll */}
          <div id="scraping-form" className="max-w-4xl mx-auto">
                        {packs.length > 0 && selectedPack ? (
              <ScrapeForm
                url={url}
                setUrl={setUrl}
                loading={loading}
                packs={packs}
                selectedPackId={selectedPackId}
                setSelectedPackId={setSelectedPackId}
                selectedPack={selectedPack}
                onScrape={handleScrape}
              />
            ) : (
              <div className="text-center p-8 bg-gray-100 rounded-lg">
                <p>Chargement des packs...</p>
              </div>
            )}
            
                        {selectedPack && <SelectedPackInfos selectedPack={selectedPack} />}
            
            {loading && (
              <ScrapeProgress 
                percent={progress} 
                stepLabel={status}
              />
            )}
          </div>
        </section>

        {/* Results Section */}
        <ScrapeResultSection
          scrapeDone={scrapeDone}
          isPaid={isPaid}
          stats={stats}
          propPreviewItems={previewItems}
          onPayment={() => selectedPackId && handlePayment(selectedPackId)}
          exportData={exportData}
          resetScrape={resetScrape}
        />

        {paymentInfo && (
          <PaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setPaymentModalOpen(false)}
            onStripePay={onStripePay}
            onMvolaPay={onMvolaPay}
            planName={paymentInfo.pack.name}
          />
        )}

        {/* Comment ça fonctionne + Value Proposition Cards - Fusionnés */}
        <section className="w-full py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Comment ça fonctionne ?
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-12">
                Un processus simple et efficace en 3 étapes pour transformer vos recherches en données exploitables
              </p>
            </div>
            
            {/* Étapes du processus */}
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <div className="relative">
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 h-full">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                    <Search className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                    1
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Configurez votre recherche
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Définissez vos critères sur Facebook Marketplace ou LinkedIn : 
                    catégorie de produits, fourchette de prix, zone géographique, etc.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      <strong>💡 Astuce :</strong> Plus vos filtres sont précis, 
                      plus les données extraites seront pertinentes pour votre analyse.
                    </p>
                  </div>
                </div>
                
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-200">
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 h-full">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                    <Play className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                    2
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Lancez l'extraction
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Notre outil automatisé parcourt et extrait toutes les données 
                    correspondant à vos critères en quelques minutes.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      <strong>💡 Astuce :</strong> Surveillez la barre de progression 
                      pour suivre l'avancement de votre extraction en temps réel.
                    </p>
                  </div>
                </div>

                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-200">
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 h-full">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                    <Download className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                    3
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Téléchargez vos données
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Recevez un fichier Excel structuré avec tous vos résultats, 
                    prêt pour vos analyses et présentations.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      <strong>💡 Astuce :</strong> Données formatées pour vos analyses, 
                      tableaux de bord et présentations.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Value Proposition Cards */}
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <Clock className="w-8 h-8 text-blue-600 mb-3 mx-auto" />
                <h3 className="font-semibold text-gray-900 mb-2">Gain de temps</h3>
                <p className="text-sm text-gray-600">Extraction en quelques clics au lieu d'heures de copier-coller</p>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <Database className="w-8 h-8 text-green-600 mb-3 mx-auto" />
                <h3 className="font-semibold text-gray-900 mb-2">Données structurées</h3>
                <p className="text-sm text-gray-600">Export Excel prêt pour vos analyses et tableaux de bord</p>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <BarChart3 className="w-8 h-8 text-purple-600 mb-3 mx-auto" />
                <h3 className="font-semibold text-gray-900 mb-2">Analyse concurrentielle</h3>
                <p className="text-sm text-gray-600">Surveillez la concurrence et identifiez les opportunités</p>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <Shield className="w-8 h-8 text-gray-600 mb-3 mx-auto" />
                <h3 className="font-semibold text-gray-900 mb-2">Sans compte</h3>
                <p className="text-sm text-gray-600">Aucune inscription requise, résultats immédiats</p>
              </div>
            </div>
          </div>
        </section>

        {/* Exemples d'utilisation par domaine */}
        <section className="w-full py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Cas d'usage par secteur
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Découvrez comment différents professionnels utilisent EasyScrapyMG pour optimiser leurs activités
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Immobilier */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-200">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
                  <Home className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Immobilier
                </h3>
                <p className="text-gray-700 mb-4">
                  Analysez le marché immobilier, surveillez les prix par quartier et identifiez les bonnes affaires.
                </p>
                <div className="bg-white/80 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <strong>Exemple :</strong> "Je surveille 500+ annonces de location à Antananarivo pour optimiser mes tarifs"
                  </p>
                </div>
              </div>

              {/* E-commerce */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 border border-green-200">
                <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mb-6">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  E-commerce & Retail
                </h3>
                <p className="text-gray-700 mb-4">
                  Surveillez la concurrence, analysez les tendances prix et découvrez de nouveaux fournisseurs.
                </p>
                <div className="bg-white/80 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <strong>Exemple :</strong> "J'analyse les prix de 200+ produits électroniques pour rester compétitif"
                  </p>
                </div>
              </div>

              {/* Automobile */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8 border border-purple-200">
                <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mb-6">
                  <Car className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Automobile
                </h3>
                <p className="text-gray-700 mb-4">
                  Évaluez la cote des véhicules, analysez l'offre par région et optimisez vos achats/ventes.
                </p>
                <div className="bg-white/80 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <strong>Exemple :</strong> "Je compare 300+ véhicules d'occasion pour mes clients concessionnaire"
                  </p>
                </div>
              </div>

              {/* Marketing & Études */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-8 border border-orange-200">
                <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center mb-6">
                  <BarChart2 className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Marketing & Études
                </h3>
                <p className="text-gray-700 mb-4">
                  Réalisez des études de marché, analysez le comportement consommateur et créez des rapports clients.
                </p>
                <div className="bg-white/80 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <strong>Exemple :</strong> "J'extrais 1000+ annonces pour mes études sectorielles mensuelles"
                  </p>
                </div>
              </div>

              {/* Services Financiers */}
              <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl p-8 border border-teal-200">
                <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center mb-6">
                  <LineChart className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Services Financiers
                </h3>
                <p className="text-gray-700 mb-4">
                  Évaluez les actifs, analysez les tendances marché et créez des rapports de valorisation.
                </p>
                <div className="bg-white/80 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <strong>Exemple :</strong> "Je valorise des biens pour mes dossiers de crédit immobilier"
                  </p>
                </div>
              </div>

              {/* Consultants */}
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-8 border border-indigo-200">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-6">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Consulting & Stratégie
                </h3>
                <p className="text-gray-700 mb-4">
                  Collectez des données marché pour vos recommandations stratégiques et analyses concurrentielles.
                </p>
                <div className="bg-white/80 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <strong>Exemple :</strong> "Je fournis des analyses sectorielles basées sur des données réelles"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Conçu pour les professionnels exigeants */}
        <section className="w-full py-16 bg-gradient-to-r from-gray-900 to-gray-800">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Conçu pour les professionnels exigeants
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Des fonctionnalités avancées et une fiabilité à toute épreuve pour vos projets les plus critiques
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-semibold text-white mb-2">Sécurité & Confidentialité</h3>
                <p className="text-gray-300">Chiffrement de bout en bout et protection des données selon les standards internationaux</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-semibold text-white mb-2">Performance & Fiabilité</h3>
                <p className="text-gray-300">Infrastructure robuste pour traiter de gros volumes avec une disponibilité de 99.9%</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-semibold text-white mb-2">Support Expert</h3>
                <p className="text-gray-300">Équipe technique dédiée pour vous accompagner dans vos projets les plus complexes</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="w-full py-16">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Questions fréquentes
              </h2>
            </div>
            
            <div className="space-y-8">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Quels types de données puis-je extraire ?
                </h3>
                <p className="text-gray-600">
                  Titres, prix, descriptions, images, localisations, URLs des annonces, informations de contact quand disponibles, 
                  et métadonnées utiles pour vos analyses de marché.
                </p>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-2">
                  L'extraction respecte-t-elle les conditions d'utilisation ?
                </h3>
                <p className="text-gray-600">
                  Oui, notre outil respecte les limitations et bonnes pratiques d'extraction. 
                  Nous recommandons un usage responsable et conforme aux CGU des plateformes.
                </p>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Puis-je automatiser des extractions régulières ?
                </h3>
                <p className="text-gray-600">
                  Contactez-nous pour discuter de solutions d'automatisation adaptées à vos besoins professionnels 
                  et volumes d'extraction.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

  );
}