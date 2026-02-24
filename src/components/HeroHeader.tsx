import React from "react";
import { Zap, Facebook, Linkedin } from "lucide-react";

export default function HeroHeader() {
  return (
    <section className="relative w-full max-w-6xl mx-auto px-4 py-16">
      <div className="text-center">
        {/* Badge de service */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-navy-50 text-navy rounded-full text-sm font-medium mb-6">
          <Zap className="w-4 h-4" />
          Extraction automatisée de données marketplace
        </div>
        
        {/* Titre principal */}
        <h1 className="text-5xl md:text-6xl font-bold text-navy mb-6 tracking-tight leading-tight">
          Transformez vos recherches en
          <span className="block text-navy">données exploitables</span>
        </h1>
        
        {/* Sous-titre */}
        <p className="text-xl text-steel mb-8 max-w-3xl mx-auto leading-relaxed">
          Extrayez instantanément les données de <strong>Facebook Marketplace</strong> et <strong>LinkedIn</strong> 
          en fichiers Excel structurés. Gagnez des heures d'analyse manuelle.
        </p>

        {/* Plateformes supportées */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="flex items-center gap-2 text-navy bg-navy-50 px-4 py-2 rounded-full">
            <Facebook className="w-5 h-5" />
            <span className="font-medium">Facebook Marketplace</span>
          </div>
          <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-full opacity-70">
            <Linkedin className="w-5 h-5" />
            <span className="font-medium">LinkedIn</span>
            <span className="text-xs text-steel italic">bientôt</span>
          </div>
        </div>
      </div>
    </section>
  );
}