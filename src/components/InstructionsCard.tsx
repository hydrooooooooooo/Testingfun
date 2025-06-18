
import React from "react";
import { Facebook, Linkedin } from "lucide-react";

export default function InstructionsCard() {
  const steps = [
    {
      label: "Filtre ta recherche",
      desc: "Personnalise ta recherche sur Facebook ou bientôt LinkedIn : catégorie, prix, lieu… pour obtenir précisément ce que tu veux.",
      icon: (
        <span className="rounded-xl bg-blue-50 p-2">
          <Facebook className="text-blue-500" size={22} />
        </span>
      ),
    },
    {
      label: "Copie/Colle l’URL",
      desc: "Récupère le lien de la page depuis la barre d’adresse de ton navigateur.",
      icon: (
        <span className="rounded-xl bg-green-50 p-2">
          <Linkedin className="text-green-600" size={22} />
        </span>
      ),
    },
    {
      label: "Lance l’extraction",
      desc: "Colle le lien dans le champ ci-dessous puis clique sur « Scraper ».",
      icon: (
        <span className="rounded-xl bg-blue-100 p-2">
          <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-blue-400">
            <path d="M8 17l4 4 4-4m-4-5v9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="3" y="3" width="18" height="10" rx="2" strokeWidth="2"/>
          </svg>
        </span>
      ),
    },
  ];
  return (
    <section className="mx-auto w-full max-w-2xl mt-2 mb-7 px-2">
      <div className="rounded-2xl shadow-2xl border border-blue-100 bg-white/80 pb-4 pt-2 px-2 md:px-7 flex flex-col items-center relative animate-fade-in">
        {/* Bandeau réseaux disponibles */}
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex gap-2 shadow-md bg-gradient-to-r from-blue-100 to-green-50 px-5 py-1 rounded-full z-20 border border-blue-200">
          <span className="flex items-center gap-1 text-blue-700 font-bold text-xs">
            <Facebook size={16} className="inline-block" /> Facebook
          </span>
          <span className="flex items-center gap-1 text-green-700 font-bold text-xs opacity-70">
            <Linkedin size={16} className="inline-block" />
            LinkedIn <span className="italic text-xs text-gray-500 pl-0.5">bientôt</span>
          </span>
        </div>
        {/* Steps */}
        <div className="mt-8 mb-2 w-full">
          <span className="text-center block font-playfair text-lg md:text-2xl font-bold text-primary mb-2 tracking-tight">Comment ça marche ?</span>
          <ol className="flex flex-col md:flex-row gap-4 md:gap-0 md:justify-between w-full">
            {steps.map((step, i) => (
              <li key={i} className="flex flex-row md:flex-col items-center text-start md:text-center md:w-1/3 px-2">
                <div className="mb-0 md:mb-3 mr-3 md:mr-0">{step.icon}</div>
                <div>
                  <span className="block font-semibold text-primary text-sm md:text-base">{`${i + 1}. ${step.label}`}</span>
                  <span className="block text-xs md:text-sm text-muted-foreground mt-0.5 font-sans">{step.desc}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-2 text-[13px] font-sans text-blue-600 text-center">
          <span className="block">💡 Astuce : Plus tes filtres sont précis, plus tes exports seront pertinents.</span>
          <span className="block text-green-700 mt-1 font-semibold">LinkedIn Marketplace arrive bientôt !</span>
        </div>
      </div>
    </section>
  );
}
