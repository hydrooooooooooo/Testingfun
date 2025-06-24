import React from "react";
import Layout from "@/components/Layout";
import { 
  Mail, 
  HelpCircle, 
  Clock, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle,
  Users,
  Shield,
  Zap,
  ArrowRight,
  FileText,
  Search,
  Database
} from "lucide-react";

export default function SupportPage() {
  const handleEmailClick = () => {
    const subject = encodeURIComponent("Support EasyScrapyMG - Demande d'assistance");
    const body = encodeURIComponent(`
Bonjour,

Je vous contacte concernant :

📝 Nature du problème : [Décrivez votre problème ici]

🔗 URL scrappée : [Indiquez l'URL si applicable]

🆔 ID scraping : [Si vous en avez un : scrape_xxxxxx]
🆔 ID Dataset : [Si vous en avez un : ds_xxxxxx]

📱 Informations supplémentaires :
- Navigateur utilisé : 
- Étape où le problème survient :

Merci d'avance pour votre aide !

Cordialement,
[Votre nom]
    `);
    
    window.location.href = `mailto:support@easyscrapymg.com?subject=${subject}&body=${body}`;
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        
        {/* Hero Section */}
        <section className="w-full max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
              <HelpCircle className="w-4 h-4" />
              Centre d'aide et support
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
              Support technique
              <span className="block text-blue-600">professionnel</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Notre équipe d'experts est à votre disposition pour vous accompagner dans l'utilisation 
              d'EasyScrapyMG et résoudre rapidement tous vos problèmes techniques.
            </p>

            {/* Trust Indicators */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="flex items-center justify-center gap-3 text-gray-600">
                <Clock className="w-6 h-6 text-blue-500" />
                <span className="font-medium">Réponse sous 48h</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-gray-600">
                <Users className="w-6 h-6 text-green-500" />
                <span className="font-medium">Équipe dédiée</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-gray-600">
                <Shield className="w-6 h-6 text-purple-500" />
                <span className="font-medium">Support expert</span>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Principal */}
        <section className="w-full max-w-4xl mx-auto px-4 mb-16">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-200 shadow-lg">
            <div className="text-center space-y-6">
              <div className="flex items-center justify-center gap-3">
                <Mail className="w-8 h-8 text-blue-600" />
                <h2 className="text-3xl font-bold text-gray-900">Contact Support</h2>
              </div>
              
              <p className="text-lg text-gray-700 max-w-2xl mx-auto">
                Pour toute question technique, problème d'extraction ou demande d'assistance personnalisée.
              </p>
              
              <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
                <button 
                  onClick={handleEmailClick}
                  className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  support@easyscrapymg.com
                </button>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Support technique spécialisé</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Résolution rapide des problèmes</span>
                </div>
              </div>

              <button 
                onClick={handleEmailClick}
                className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
              >
                <Mail className="w-5 h-5" />
                Contacter le support
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Guide pour contacter efficacement */}
        <section className="w-full max-w-6xl mx-auto px-4 mb-16">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-2">
                <MessageSquare className="w-6 h-6 text-blue-600" />
                Comment nous contacter efficacement
              </h3>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Pour un traitement plus rapide de votre demande, suivez ces recommandations.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-lg">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  Informations à inclure
                </h4>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">ID scraping</p>
                      <p className="text-sm text-gray-600">Format: scrape_xxxxxx (affiché pendant l'extraction)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">ID Dataset</p>
                      <p className="text-sm text-gray-600">Format: ds_xxxxxx (visible dans les résultats)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">URL concernée</p>
                      <p className="text-sm text-gray-600">L'adresse que vous tentez de scraper</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">Description précise</p>
                      <p className="text-sm text-gray-600">Étapes et message d'erreur si applicable</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Délais de réponse
                </h4>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-medium text-gray-900">Problèmes techniques</span>
                    </div>
                    <p className="text-sm text-gray-600">Réponse sous 24-48h maximum</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="font-medium text-gray-900">Questions générales</span>
                    </div>
                    <p className="text-sm text-gray-600">Réponse sous 24h en moyenne</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="font-medium text-gray-900">Demandes urgentes</span>
                    </div>
                    <p className="text-sm text-gray-600">Priorité élevée, traitement accéléré</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200 text-center">
              <p className="text-sm text-blue-800">
                <strong>💡 Astuce :</strong> Les identifiants scraping et dataset sont affichés lors de l'extraction sur la page d'accueil.
                Prenez-en note pour faciliter le support !
              </p>
            </div>
          </div>
        </section>

        {/* Types de support disponibles */}
        <section className="w-full max-w-6xl mx-auto px-4 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Types de support disponibles
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Notre équipe vous accompagne sur tous les aspects techniques et fonctionnels
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Problèmes d'extraction</h3>
              <p className="text-gray-600 text-sm">Erreurs de scraping, URLs non supportées, problèmes de configuration</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <Database className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Export des données</h3>
              <p className="text-gray-600 text-sm">Problèmes de téléchargement, formats de fichiers, données manquantes</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Questions facturation</h3>
              <p className="text-gray-600 text-sm">Paiements, crédits, remboursements et problèmes de transaction</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Formation & conseils</h3>
              <p className="text-gray-600 text-sm">Optimisation des extractions, bonnes pratiques, conseils d'usage</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Incidents & bugs</h3>
              <p className="text-gray-600 text-sm">Signalement de bugs, problèmes techniques, améliorations suggérées</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Demandes spéciales</h3>
              <p className="text-gray-600 text-sm">Extractions personnalisées, volumes importants, intégrations spécifiques</p>
            </div>
          </div>
        </section>

        {/* FAQ Rapide */}
        <section className="w-full max-w-4xl mx-auto px-4 mb-16">
          <div className="bg-gray-50 rounded-2xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Questions fréquentes
              </h2>
              <p className="text-gray-600">
                Consultez ces réponses avant de nous contacter
              </p>
            </div>
            
            <div className="space-y-4">
              <details className="bg-white rounded-xl p-4 cursor-pointer shadow-sm border border-gray-100">
                <summary className="font-semibold text-gray-900 flex items-center justify-between">
                  Où trouver mon ID scraping et Dataset ?
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </summary>
                <p className="text-gray-600 mt-3 text-sm leading-relaxed">
                  Ces identifiants s'affichent automatiquement pendant et après l'extraction sur la page d'accueil. 
                  Notez-les pour faciliter le support en cas de problème.
                </p>
              </details>
              
              <details className="bg-white rounded-xl p-4 cursor-pointer shadow-sm border border-gray-100">
                <summary className="font-semibold text-gray-900 flex items-center justify-between">
                  Que faire si mon extraction échoue ?
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </summary>
                <p className="text-gray-600 mt-3 text-sm leading-relaxed">
                  Contactez-nous avec votre ID scraping, l'URL problématique et une description de l'erreur. 
                  Nous investiguerons rapidement et rembourserons si nécessaire.
                </p>
              </details>
              
              <details className="bg-white rounded-xl p-4 cursor-pointer shadow-sm border border-gray-100">
                <summary className="font-semibold text-gray-900 flex items-center justify-between">
                  Comment optimiser mes extractions ?
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </summary>
                <p className="text-gray-600 mt-3 text-sm leading-relaxed">
                  Utilisez des filtres précis sur la plateforme source, évitez les URLs trop génériques 
                  et contactez-nous pour des conseils personnalisés selon votre secteur d'activité.
                </p>
              </details>
              
              <details className="bg-white rounded-xl p-4 cursor-pointer shadow-sm border border-gray-100">
                <summary className="font-semibold text-gray-900 flex items-center justify-between">
                  Mes crédits ont-ils une date d'expiration ?
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </summary>
                <p className="text-gray-600 mt-3 text-sm leading-relaxed">
                  Non, vos crédits d'extraction n'expirent jamais. Vous pouvez les utiliser à votre rythme, 
                  quand vous en avez besoin.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="w-full bg-gradient-to-r from-gray-900 to-gray-800 py-16">
          <div className="max-w-4xl mx-auto px-4 text-center text-white">
            <h3 className="text-3xl font-bold mb-4">
              Une question ? Nous sommes là pour vous aider
            </h3>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Notre équipe technique vous accompagne pour tirer le meilleur parti d'EasyScrapyMG.
            </p>
            <button 
              onClick={handleEmailClick}
              className="bg-white text-gray-900 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
            >
              <Mail className="w-5 h-5" />
              Contacter le support
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section>
      </div>
    </Layout>
  );
}