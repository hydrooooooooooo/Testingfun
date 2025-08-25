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
  LineChart,
  Copy,
  Link,
  Star,
  Timer,
  DollarSign
} from "lucide-react";

// Ajout Google Fonts (Inter)
if (typeof document !== "undefined" && !document.getElementById("google-inter")) {
  const link = document.createElement("link");
  link.id = "google-inter";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";
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
    <div className="flex flex-col items-center min-h-screen w-full bg-gradient-to-b from-blue-50 to-white">
      
      {/* Hero Section Ultra Simplifié */}
      <section className="w-full max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          {/* Badge d'introduction */}
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 rounded-full text-sm font-semibold mb-8 border border-blue-200">
            <Zap className="w-4 h-4" />
            Extraction automatique Facebook Marketplace
          </div>
          
          {/* Titre principal simplifié et percutant */}
          <h1 className="text-6xl md:text-7xl font-black text-gray-900 mb-8 tracking-tight leading-tight">
            Transformez une recherche 
            <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              en fichier Excel
            </span>
          </h1>
          
          {/* Sous-titre ultra clair */}
          <p className="text-2xl text-gray-700 mb-12 max-w-4xl mx-auto leading-relaxed font-medium">
            Copiez l'URL de votre recherche Facebook Marketplace, 
            <span className="block text-blue-600 font-bold">obtenez TOUTES les données en Excel en 3 minutes ⚡</span>
          </p>

          {/* Bénéfices immédiats */}
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl shadow-lg border border-gray-100">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Timer className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-900">Fini le copier-coller</p>
                <p className="text-sm text-gray-600">3 minutes au lieu de 3 heures</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl shadow-lg border border-gray-100">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-900">Excel prêt à utiliser</p>
                <p className="text-sm text-gray-600">Toutes les données organisées</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl shadow-lg border border-gray-100">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-900">Pas d'abonnement</p>
                <p className="text-sm text-gray-600">Payez uniquement ce que vous utilisez</p>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions ultra simples */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 mb-12 text-white">
          <h2 className="text-3xl font-bold text-center mb-8">Comment faire ? C'est simple !</h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-black">1</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Cherchez sur Facebook</h3>
              <p className="text-blue-100">Faites votre recherche normale sur Facebook Marketplace</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-black">2</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Copiez l'URL</h3>
              <p className="text-blue-100">Copiez l'adresse de la page de résultats</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-black">3</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Récupérez Excel</h3>
              <p className="text-blue-100">Téléchargez votre fichier avec toutes les données</p>
            </div>
          </div>
        </div>

        {/* Formulaire principal */}
        <div id="scraping-form" className="max-w-4xl mx-auto">
          {packs.length > 0 && selectedPack ? (
            <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
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
            </div>
          ) : (
            <div className="text-center p-8 bg-gray-100 rounded-3xl">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-lg font-semibold text-gray-700">Chargement des options...</p>
            </div>
          )}
          
          {selectedPack && <SelectedPackInfos selectedPack={selectedPack} />}
          
          {loading && (
            <div className="mt-8">
              <ScrapeProgress 
                percent={progress} 
                stepLabel={status}
              />
            </div>
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

      {/* Section Problème/Solution très claire */}
      <section className="w-full py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Problème */}
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-8">
                😤 Vous perdez des heures à faire ça ?
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-6 bg-red-50 border border-red-200 rounded-2xl">
                  <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-sm font-bold">❌</span>
                  </div>
                  <div>
                    <p className="font-semibold text-red-800">Copier-coller chaque annonce une par une</p>
                    <p className="text-red-600 text-sm mt-1">3 heures pour 100 annonces...</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-6 bg-red-50 border border-red-200 rounded-2xl">
                  <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-sm font-bold">❌</span>
                  </div>
                  <div>
                    <p className="font-semibold text-red-800">Risquer d'oublier des données importantes</p>
                    <p className="text-red-600 text-sm mt-1">Prix, contact, localisation manqués</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-6 bg-red-50 border border-red-200 rounded-2xl">
                  <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-sm font-bold">❌</span>
                  </div>
                  <div>
                    <p className="font-semibold text-red-800">Données non organisées pour vos analyses</p>
                    <p className="text-red-600 text-sm mt-1">Impossible de faire des graphiques</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Solution */}
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-8">
                ⚡ Notre solution automatique !
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-6 bg-green-50 border border-green-200 rounded-2xl">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-800">Extraction automatique de TOUTES les annonces</p>
                    <p className="text-green-600 text-sm mt-1">3 minutes pour 1000+ annonces</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-6 bg-green-50 border border-green-200 rounded-2xl">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-800">Toutes les données capturées automatiquement</p>
                    <p className="text-green-600 text-sm mt-1">Prix, description, contact, images, localisation</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-6 bg-green-50 border border-green-200 rounded-2xl">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-800">Excel parfaitement organisé</p>
                    <p className="text-green-600 text-sm mt-1">Prêt pour tableaux de bord et analyses</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cas d'usage simplifiés */}
      <section className="w-full py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Parfait pour tous les professionnels
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Que vous soyez dans l'immobilier, l'automobile, le e-commerce ou les études de marché
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Immobilier */}
            <div className="group bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-8 border border-blue-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Home className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Immobilier</h3>
              <p className="text-gray-700 mb-6">
                Surveillez les prix du marché et trouvez les meilleures opportunités
              </p>
              <div className="bg-white/80 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-700">
                  "500+ annonces analysées en 3 minutes au lieu de 2 jours"
                </p>
              </div>
            </div>

            {/* E-commerce */}
            <div className="group bg-gradient-to-br from-green-50 to-green-100 rounded-3xl p-8 border border-green-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">E-commerce</h3>
              <p className="text-gray-700 mb-6">
                Analysez la concurrence et optimisez vos prix de vente
              </p>
              <div className="bg-white/80 rounded-xl p-4">
                <p className="text-sm font-semibold text-green-700">
                  "Surveillance concurrentielle automatisée"
                </p>
              </div>
            </div>

            {/* Automobile */}
            <div className="group bg-gradient-to-br from-purple-50 to-purple-100 rounded-3xl p-8 border border-purple-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Car className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Automobile</h3>
              <p className="text-gray-700 mb-6">
                Évaluez la cote des véhicules et trouvez les meilleures affaires
              </p>
              <div className="bg-white/80 rounded-xl p-4">
                <p className="text-sm font-semibold text-purple-700">
                  "Comparaison de 1000+ véhicules instantanée"
                </p>
              </div>
            </div>

            {/* Études de marché */}
            <div className="group bg-gradient-to-br from-orange-50 to-orange-100 rounded-3xl p-8 border border-orange-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Études</h3>
              <p className="text-gray-700 mb-6">
                Réalisez des études de marché complètes avec des données réelles
              </p>
              <div className="bg-white/80 rounded-xl p-4">
                <p className="text-sm font-semibold text-orange-700">
                  "Rapports clients alimentés par des données réelles"
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Témoignages/Garanties */}
      <section className="w-full py-20 bg-gradient-to-r from-gray-900 to-gray-800">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-12">
            Pourquoi nous faire confiance ?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur rounded-3xl p-8 border border-white/20">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">100% Sécurisé</h3>
              <p className="text-gray-300">
                Aucune donnée stockée. Chiffrement de bout en bout pour protéger vos recherches.
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-3xl p-8 border border-white/20">
              <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">99.9% Fiable</h3>
              <p className="text-gray-300">
                Infrastructure robuste qui traite des milliers de requêtes chaque jour sans interruption.
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-3xl p-8 border border-white/20">
              <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Support Expert</h3>
              <p className="text-gray-300">
                Équipe technique malgache disponible pour vous aider à optimiser vos extractions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ ultra simplifiée */}
      <section className="w-full py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Questions fréquentes
            </h2>
            <p className="text-xl text-gray-600">Tout ce que vous devez savoir</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                ❓ Quelles données j'obtiens ?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Tout ! Titres, prix, descriptions, images, localisations, contacts, URLs... 
                Parfaitement organisé dans un fichier Excel prêt à utiliser.
              </p>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                ⚡ C'est vraiment si rapide ?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Oui ! 3 minutes en moyenne pour extraire des centaines d'annonces, 
                au lieu des heures que ça vous prendrait manuellement.
              </p>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                🔒 Mes données sont protégées ?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Absolument. Nous ne stockons rien. Vos URL et données sont traitées en temps réel 
                puis supprimées automatiquement.
              </p>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                💰 Dois-je m'abonner ?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Non ! Pas d'abonnement. Vous payez uniquement ce que vous utilisez. 
                Idéal pour tester ou pour une utilisation ponctuelle.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}