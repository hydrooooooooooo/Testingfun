
export type Pack = {
  id: string;
  name: string;
  nbDownloads: number;
  price: number;
  currency: "eur" | "ar";
  priceLabel: string; // ex. "5 € / 25 000 Ar"
  description: string;
  popular?: boolean;
};

export const PLANS: Pack[] = [
  {
    id: "pack-decouverte",
    name: "Pack Découverte",
    nbDownloads: 50,
    price: 5,
    currency: "eur",
    priceLabel: "5 € / 25 000 Ar",
    description: "50 extractions complètes de données pour découvrir la qualité de nos services. Crédits sans expiration.",
  },
  {
    id: "pack-essentiel",
    name: "Pack Essentiel",
    nbDownloads: 150,
    price: 12,
    currency: "eur",
    priceLabel: "12 € / 60 000 Ar",
    description: "150 extractions de données complètes. Économisez 47% par rapport aux téléchargements individuels. Notre offre la plus populaire.",
    popular: true
  },
  {
    id: "pack-business",
    name: "Pack Business",
    nbDownloads: 350,
    price: 25,
    currency: "eur",
    priceLabel: "25 € / 125 000 Ar",
    description: "350 extractions complètes avec économies substantielles. Idéal pour vos projets d'analyse de données récurrents.",
  },
  {
    id: "pack-pro",
    name: "Pack Pro",
    nbDownloads: 700,
    price: 45,
    currency: "eur",
    priceLabel: "45 € / 225 000 Ar",
    description: "700 extractions de données professionnelles. Maximisez vos économies tout en accédant à des données de qualité supérieure.",
  },
  {
    id: "pack-enterprise",
    name: "Pack Enterprise",
    nbDownloads: 1300,
    price: 80,
    currency: "eur",
    priceLabel: "80 € / 400 000 Ar",
    description: "1300 extractions au meilleur tarif. Parfait pour les agences et grandes entreprises avec crédits permanents.",
  }
];

