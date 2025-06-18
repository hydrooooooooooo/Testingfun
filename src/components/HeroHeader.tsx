
import React from "react";

export default function HeroHeader() {
  return (
    <section className="relative mx-auto w-full max-w-3xl mt-12 mb-8 px-0 flex flex-col items-center">
      {/* Un fond plus léger et subtil sans “barre” */}
      <div className="absolute inset-0 -top-16 w-full h-48 bg-gradient-to-b from-blue-100/70 via-white/50 to-transparent z-0 rounded-b-[48px] blur pointer-events-none" />
      <div className="relative z-10 w-full flex flex-col items-center px-4">
        <h1 className="font-playfair text-4xl md:text-5xl font-black text-primary mb-2 text-center leading-[1.17] tracking-tight">
          Scraper en 1 clic
        </h1>
        <p className="font-sans text-lg text-muted-foreground mt-1 mb-6 text-center max-w-xl">
          Obtenez un aperçu gratuit de&nbsp;<span className="font-bold text-blue-700">Facebook</span> et <span className="font-bold text-green-700">LinkedIn</span>. <br />
          Débloquez ensuite <span className="font-medium">toutes les données et l’export Excel</span> ! 🚀 Aucun compte requis.
        </p>
        {/* Suppression des badges "Facebook" et "LinkedIn" en double */}
      </div>
    </section>
  )
}
