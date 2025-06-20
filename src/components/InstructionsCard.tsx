import React from "react";
import { Search, Play, Download, ArrowRight } from "lucide-react";

export default function InstructionsCard() {
  const steps = [
    {
      id: 1,
      label: "Configurez votre recherche",
      desc: "Définissez vos critères sur Facebook Marketplace ou LinkedIn : catégorie de produits, fourchette de prix, zone géographique, etc.",
      tip: "Plus vos filtres sont précis, plus les données extraites seront pertinentes pour votre analyse.",
      icon: <Search className="w-6 h-6 text-blue-600" />,
      bgColor: "bg-blue-100"
    },
    {
      id: 2,
      label: "Lancez l'extraction",
      desc: "Copiez l'URL de votre page de résultats et collez-la dans notre outil. Choisissez votre pack et lancez l'extraction automatique.",
      tip: "L'extraction se fait en quelques minutes, même pour des centaines d'annonces.",
      icon: <Play className="w-6 h-6 text-green-600" />,
      bgColor: "bg-green-100"
    },
    {
      id: 3,
      label: "Exploitez vos données",
      desc: "Téléchargez votre fichier Excel structuré avec toutes les informations : prix, descriptions, localisations, images, URLs, etc.",
      tip: "Données formatées pour vos analyses, tableaux de bord et présentations.",
      icon: <Download className="w-6 h-6 text-purple-600" />,
      bgColor: "bg-purple-100"
    }
  ];

  return (
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
          {steps.map((step, index) => (
            <div key={step.id} className="relative">
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 h-full">
                {/* Icône */}
                <div className={`w-12 h-12 ${step.bgColor} rounded-xl flex items-center justify-center mb-6`}>
                  {step.icon}
                </div>
                
                {/* Numéro d'étape */}
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  {step.id}
                </div>
                
                {/* Contenu */}
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {step.label}
                </h3>
                <p className="text-gray-600 mb-6">
                  {step.desc}
                </p>
                
                {/* Astuce */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <strong>💡 Astuce :</strong> {step.tip}
                  </p>
                </div>
              </div>
              
              {/* Flèche pour desktop (sauf sur le dernier élément) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-200">
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}