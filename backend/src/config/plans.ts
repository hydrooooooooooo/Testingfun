export type Pack = {
  id: string;
  name: string;
  nbDownloads: number;
  price: number;
  currency: "eur" | "ar";
  priceLabel: string;
  description: string;
  popular?: boolean;
  stripePriceId: string; // L'ID du prix de l'article dans Stripe
};

// ATTENTION : Les stripePriceId ci-dessous sont des valeurs de DÉPANNAGE.
// Vous DEVEZ les remplacer par les VRAIS Price IDs de votre compte Stripe pour que le paiement fonctionne en production.
export const PLANS: Pack[] = [
  {
    id: "pack-decouverte",
    name: "Pack Découverte",
    nbDownloads: 50,
    price: 25000,
    currency: "ar",
    priceLabel: "5 € / 25 000 Ar",
    description: "50 extractions complètes de données pour découvrir la qualité de nos services. Crédits sans expiration.",
    stripePriceId: "price_1RaCEAP6UShCV9FsS1FImeAP", // ID de DÉPANNAGE
  },
  {
    id: "pack-essentiel",
    name: "Pack Essentiel",
    nbDownloads: 150,
    price: 60000,
    currency: "ar",
    priceLabel: "12 € / 60 000 Ar",
    description: "150 extractions de données complètes. Économisez 47% par rapport aux téléchargements individuels. Notre offre la plus populaire.",
    popular: true,
    stripePriceId: "price_1RaCEAP6UShCV9FsS1FImeAP", // ID de DÉPANNAGE
  },
  {
    id: "pack-business",
    name: "Pack Business",
    nbDownloads: 350,
    price: 125000,
    currency: "ar",
    priceLabel: "25 € / 125 000 Ar",
    description: "350 extractions complètes avec économies substantielles. Idéal pour vos projets d'analyse de données récurrents.",
    stripePriceId: "price_1RaCEAP6UShCV9FsS1FImeAP", // ID de DÉPANNAGE
  },
  {
    id: "pack-pro",
    name: "Pack Pro",
    nbDownloads: 700,
    price: 225000,
    currency: "ar",
    priceLabel: "45 € / 225 000 Ar",
    description: "700 extractions de données professionnelles. Maximisez vos économies tout en accédant à des données de qualité supérieure.",
    stripePriceId: "price_1RaCEAP6UShCV9FsS1FImeAP", // ID de DÉPANNAGE
  },
  {
    id: "pack-enterprise",
    name: "Pack Enterprise",
    nbDownloads: 1300,
    price: 400000,
    currency: "ar",
    priceLabel: "80 € / 400 000 Ar",
    description: "1300 extractions au meilleur tarif. Parfait pour les agences et grandes entreprises avec crédits permanents.",
    stripePriceId: "price_1RaCEAP6UShCV9FsS1FImeAP", // ID de DÉPANNAGE
  }
];