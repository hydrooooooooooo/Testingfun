import { config } from './config';

export type Pack = {
  id: string;
  name: string;
  nbDownloads: number;
  price: number;        // MGA price (for Stripe MGA checkout)
  priceEur: number;     // EUR price in cents (2500 = 25€)
  currency: 'eur' | 'mga';
  priceLabel: string;
  description: string;
  popular?: boolean;
  stripePriceId: string;      // Stripe Price ID for EUR
  stripePriceIdMga?: string;  // Stripe Price ID for MGA
};

/**
 * 3 packs aligned with Stripe Dashboard products.
 * Price IDs come from environment variables via config.
 */
export const PLANS: Pack[] = [
  {
    id: 'pack-starter',
    name: 'Pack Starter',
    nbDownloads: 250,
    price: 115000,
    priceEur: 2500,
    currency: 'eur',
    priceLabel: '25 € / 115 000 Ar',
    description: 'Ex : 5 pages Facebook (50 posts) + 3 audits IA + 200 annonces Marketplace|Idéal pour tester la plateforme ou un projet ponctuel|Crédits sans expiration',
    popular: false,
    stripePriceId: config.api.stripePriceStarter || '',
    stripePriceIdMga: config.api.stripePriceStarterMga || '',
  },
  {
    id: 'pack-pro',
    name: 'Pack Pro',
    nbDownloads: 750,
    price: 275000,
    priceEur: 6000,
    currency: 'eur',
    priceLabel: '60 € / 275 000 Ar',
    description: 'Ex : 10 pages Facebook + IA + 5 benchmarks + 500 annonces Marketplace|Meilleur rapport qualité-prix pour un usage régulier|Commentaires & analyses IA inclus|Crédits sans expiration',
    popular: true,
    stripePriceId: config.api.stripePricePro || '',
    stripePriceIdMga: config.api.stripePriceProMga || '',
  },
  {
    id: 'pack-business',
    name: 'Pack Business',
    nbDownloads: 2000,
    price: 550000,
    priceEur: 12000,
    currency: 'eur',
    priceLabel: '120 € / 550 000 Ar',
    description: 'Ex : 20 pages Facebook + IA + 10 benchmarks + 1 000 annonces Marketplace|Volume agence ou suivi concurrentiel intensif|Toutes fonctionnalités sans limite|Crédits sans expiration',
    popular: false,
    stripePriceId: config.api.stripePriceBusiness || '',
    stripePriceIdMga: config.api.stripePriceBusinessMga || '',
  },
];
