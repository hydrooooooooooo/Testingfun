import Layout from "@/components/Layout";
import ScrapePreview from "@/components/ScrapePreview";
import ScrapeProgress from "@/components/ScrapeProgress";
import ExcelDownloadButton from "@/components/ExcelDownloadButton";
import ScrapeSupportInfo from "@/components/ScrapeSupportInfo";
import ScrapeForm from "@/components/ScrapeForm";
import SelectedPackInfos from "@/components/SelectedPackInfos";
import ScrapeResultSection from "@/components/ScrapeResultSection";
import React from "react";
import { useScrape } from "@/hooks/useScrape";
import { PLANS, Pack } from "@/lib/plans";
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
  Play
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
    previewItems,
    handleScrape
  } = useScrape();

  return (
    <Layout>
      <div className="flex flex-col items-center min-h-screen w-full bg-gradient-to-b from-slate-50 to-white">
        
        {/* Hero Section Corporate */}
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

            {/* Value Proposition Cards */}
            <div className="grid md:grid-cols-4 gap-6 mb-12">
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

          {/* Scraping Form - Now at the top */}
          <div className="max-w-4xl mx-auto">
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
              previewItems={previewItems}
            />
          </div>
        </section>

        {/* Target Audience Section */}
        <section className="w-full bg-gray-50 py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Conçu pour les professionnels exigeants
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Que vous soyez analyste, marketeur ou entrepreneur, notre outil s'adapte à vos besoins métier
              </p>
            </div>
            
            <div className="grid md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Professionnels</h3>
                <p className="text-sm text-gray-600">Consultants, freelances et experts métier</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Building className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Entreprises</h3>
                <p className="text-sm text-gray-600">PME et grandes entreprises en veille concurrentielle</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Marketeurs</h3>
                <p className="text-sm text-gray-600">Analystes marketing et responsables communication</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Chercheurs</h3>
                <p className="text-sm text-gray-600">Analystes de marché et experts en intelligence économique</p>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works - Now at the bottom with better explanations */}
        <section className="w-full py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Comment ça fonctionne ?
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Un processus simple et efficace en 3 étapes pour transformer vos recherches en données exploitables
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1 */}
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
                
                {/* Arrow for desktop */}
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                  <ArrowRight className="w-8 h-8 text-gray-300" />
                </div>
              </div>

              {/* Step 2 */}
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
                    Copiez l'URL de votre page de résultats et collez-la dans notre outil. 
                    Choisissez votre pack et lancez l'extraction automatique.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      <strong>⚡ Rapidité :</strong> L'extraction se fait en quelques minutes, 
                      même pour des centaines d'annonces.
                    </p>
                  </div>
                </div>
                
                {/* Arrow for desktop */}
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                  <ArrowRight className="w-8 h-8 text-gray-300" />
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative">
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 h-full">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                    <Download className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                    3
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Exploitez vos données
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Téléchargez votre fichier Excel structuré avec toutes les informations : 
                    prix, descriptions, localisations, images, URLs, etc.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      <strong>📊 Prêt à l'emploi :</strong> Données formatées pour vos analyses, 
                      tableaux de bord et présentations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Pourquoi choisir notre solution ?
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Une approche professionnelle de l'extraction de données marketplace
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <CheckCircle className="w-8 h-8 text-green-600 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Aucune installation</h3>
                <p className="text-gray-600">Outil 100% web, accessible depuis n'importe quel navigateur</p>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <FileSpreadsheet className="w-8 h-8 text-blue-600 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Export Excel optimisé</h3>
                <p className="text-gray-600">Fichiers prêts pour Excel, Google Sheets et vos outils d'analyse</p>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <Zap className="w-8 h-8 text-yellow-600 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Résultats instantanés</h3>
                <p className="text-gray-600">Aperçu gratuit immédiat, données complètes après paiement</p>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <Database className="w-8 h-8 text-purple-600 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Données complètes</h3>
                <p className="text-gray-600">Prix, descriptions, images, localisations, contacts et plus encore</p>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <Shield className="w-8 h-8 text-gray-600 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Sécurisé et conforme</h3>
                <p className="text-gray-600">Respect des conditions d'utilisation et protection des données</p>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <TrendingUp className="w-8 h-8 text-green-600 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Évolutif</h3>
                <p className="text-gray-600">Du simple test aux extractions massives pour vos projets</p>
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
    </Layout>
  );
}