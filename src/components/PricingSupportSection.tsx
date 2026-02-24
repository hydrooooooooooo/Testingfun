
import React from "react";
import { Mail, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function PricingSupportSection() {
  return (
    <section className="mx-auto w-full max-w-2xl mt-14 mb-8 animate-fade-in">
      <Card className="bg-navy-50 bg-opacity-60 border-navy-200 rounded-2xl shadow-lg">
        <CardContent className="py-7 px-4 md:px-7 flex flex-col items-center gap-3">
          <div className="flex flex-row items-center gap-2 mb-2">
            <HelpCircle className="text-navy" size={22} />
            <h2 className="text-lg md:text-xl font-bold text-primary">Support et assistance</h2>
          </div>
          <p className="text-sm text-muted-foreground text-center mb-3">
            Pour toute question ou problème, contactez-nous par email.<br />
            Indiquez bien votre <span className="font-semibold">ID session</span> et votre <span className="font-semibold">ID Dataset</span> dans votre message pour un traitement plus rapide&nbsp;!
          </p>
          <div className="flex items-center gap-2 text-navy font-semibold">
            <Mail size={18} className="inline" />
            <a href="mailto:support@easyscrapymg.com" className="underline">
              support@easyscrapymg.com
            </a>
          </div>
          <div className="mt-2 text-xs text-muted-foreground text-center">
            Ces identifiants sont affichés lors de l'analyse sur la page d'accueil.<br />
            <span className="italic">Exemple : ID session : <code className="font-mono px-1 text-navy/80">scrape_xxxxxx</code> – ID Dataset : <code className="font-mono px-1 text-navy/80">ds_xxxxxx</code></span>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
