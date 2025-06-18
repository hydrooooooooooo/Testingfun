
import React from "react";
import {
  Database,
  Images,
  FileSpreadsheet,
  Zap,
  Lock,
  Infinity as InfinityIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: <Database className="text-blue-600 w-6 h-6" />,
    title: "Données complètes",
    desc: "Titre, prix, description, localisation",
  },
  {
    icon: <Images className="text-green-600 w-6 h-6" />,
    title: "Images intégrées",
    desc: "Import auto dans vos exports",
  },
  {
    icon: <FileSpreadsheet className="text-blue-700 w-6 h-6" />,
    title: "Export Excel",
    desc: "Fichier formaté et optimisé",
  },
  {
    icon: <Zap className="text-yellow-500 w-6 h-6" />,
    title: "Traitement rapide",
    desc: "Données prêtes en minutes",
  },
  {
    icon: <Lock className="text-primary w-6 h-6" />,
    title: "Sécurité garantie",
    desc: "Chiffrement & confidentialité",
  },
  {
    icon: <InfinityIcon className="text-purple-600 w-6 h-6" />,
    title: "Crédits permanents",
    desc: "Jamais d'expiration",
  },
];

export default function PricingFeatures() {
  return (
    <section className="mx-auto w-full max-w-3xl mb-4">
      <Card className="w-full bg-blue-50 bg-opacity-80 border-blue-100 rounded-xl shadow px-2 md:px-4 pt-3 pb-6">
        <CardContent className="flex flex-col w-full p-0">
          <span className="font-playfair text-md md:text-lg text-primary font-bold pr-1 mb-4 flex items-center">
            <span className="text-lg md:text-xl mr-2">✨</span>
            Inclus dans tous nos packages&nbsp;:
          </span>
          <div
            className="
              grid
              gap-2
              md:gap-4
              grid-cols-1
              sm:grid-cols-2
              md:grid-cols-3
              mt-1
            "
          >
            {features.map((f, i) => (
              <div
                key={i}
                className="
                  flex flex-col items-center text-center bg-white bg-opacity-90 border border-blue-100/60 rounded-2xl shadow-sm px-4 py-4
                  gap-2
                  min-h-[112px]
                  hover:shadow-md transition
                "
              >
                <span className="mb-1">{f.icon}</span>
                <span className="font-semibold text-primary text-[15px] md:text-base">{f.title}</span>
                <span className="text-xs text-muted-foreground leading-snug">{f.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

