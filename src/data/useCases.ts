import { Home, ShoppingBag, Car, BarChart3, type LucideIcon } from 'lucide-react';

export interface UseCase {
  slugFr: string;
  slugEn: string;
  icon: LucideIcon;
  titleFr: string;
  titleEn: string;
  descFr: string;
  descEn: string;
  heroSubFr: string;
  heroSubEn: string;
  problemFr: string;
  problemEn: string;
  solutionFr: string[];
  solutionEn: string[];
  resultFr: string;
  resultEn: string;
  audienceFr: string;
  audienceEn: string;
}

export const useCases: UseCase[] = [
  {
    slugFr: 'immobilier',
    slugEn: 'real-estate',
    icon: Home,
    titleFr: 'Immobilier',
    titleEn: 'Real Estate',
    descFr: 'Analyse de donnees immobilieres sur Facebook Marketplace et Pages.',
    descEn: 'Real estate data analytics on Facebook Marketplace and Pages.',
    heroSubFr: 'Suivez les prix, identifiez les opportunites et analysez le marche locatif ou de vente en temps reel.',
    heroSubEn: 'Track prices, identify opportunities and analyze the rental or sales market in real time.',
    problemFr: 'Les agents immobiliers passent des heures a surveiller manuellement les annonces sur Facebook Marketplace. Les prix changent vite, les opportunites disparaissent.',
    problemEn: 'Real estate agents spend hours manually monitoring listings on Facebook Marketplace. Prices change fast, opportunities disappear.',
    solutionFr: [
      "Collectez automatiquement des centaines d'annonces immobilieres avec prix, surface et localisation.",
      'Programmez des collectes recurrentes pour etre alerte des nouvelles annonces sous-cotees.',
      'Exportez en Excel pour croiser avec vos propres donnees et identifier les tendances.',
    ],
    solutionEn: [
      'Automatically collect hundreds of real estate listings with prices, area and location.',
      'Schedule recurring collections to be alerted of new underpriced listings.',
      'Export to Excel to cross-reference with your own data and identify trends.',
    ],
    resultFr: 'Identifiez les opportunites avant la concurrence et constituez une base de donnees immobiliere locale unique.',
    resultEn: 'Identify opportunities before the competition and build a unique local real estate database.',
    audienceFr: 'Agents immobiliers, promoteurs, investisseurs',
    audienceEn: 'Real estate agents, developers, investors',
  },
  {
    slugFr: 'e-commerce',
    slugEn: 'e-commerce',
    icon: ShoppingBag,
    titleFr: 'E-commerce',
    titleEn: 'E-commerce',
    descFr: 'Veille tarifaire et analyse concurrentielle pour e-commercants.',
    descEn: 'Price monitoring and competitive analysis for e-commerce sellers.',
    heroSubFr: 'Analysez les prix, la disponibilite et les strategies de vos concurrents sur Marketplace.',
    heroSubEn: 'Analyze prices, availability and competitor strategies on Marketplace.',
    problemFr: "Les vendeurs en ligne n'ont pas de visibilite sur les prix du marche Facebook. Impossible de comparer manuellement des centaines d'annonces.",
    problemEn: 'Online sellers have no visibility on Facebook market prices. Impossible to manually compare hundreds of listings.',
    solutionFr: [
      'Collectez les annonces concurrentes avec prix, descriptions et photos en quelques minutes.',
      'Programmez une veille hebdomadaire automatique pour suivre les evolutions de prix.',
      'Analysez les tendances de prix par categorie et ajustez votre strategie.',
    ],
    solutionEn: [
      'Collect competitor listings with prices, descriptions and photos in minutes.',
      'Schedule automatic weekly monitoring to track price changes.',
      'Analyze price trends by category and adjust your strategy.',
    ],
    resultFr: 'Ajustez vos prix chaque semaine en vous basant sur des donnees reelles du marche.',
    resultEn: 'Adjust your prices weekly based on real market data.',
    audienceFr: 'Vendeurs, analystes pricing, responsables e-commerce',
    audienceEn: 'Sellers, pricing analysts, e-commerce managers',
  },
  {
    slugFr: 'automobile',
    slugEn: 'automotive',
    icon: Car,
    titleFr: 'Automobile',
    titleEn: 'Automotive',
    descFr: "Analyse du marche automobile d'occasion sur Facebook.",
    descEn: 'Used car market analysis on Facebook.',
    heroSubFr: 'Evaluez la cote des vehicules, suivez les tendances et trouvez les meilleures affaires.',
    heroSubEn: 'Evaluate vehicle prices, track trends and find the best deals.',
    problemFr: "Le marche auto d'occasion sur Facebook est enorme mais impossible a surveiller manuellement. Les bonnes affaires partent en quelques heures.",
    problemEn: 'The used car market on Facebook is huge but impossible to monitor manually. Good deals are gone within hours.',
    solutionFr: [
      'Collectez les annonces auto avec prix, kilometrage, modele et localisation.',
      'Identifiez les modeles les plus demandes et les fourchettes de prix par categorie.',
      'Detectez les vehicules sous-cotes des leur publication grace aux collectes recurrentes.',
    ],
    solutionEn: [
      'Collect car listings with prices, mileage, model and location.',
      'Identify the most popular models and price ranges by category.',
      'Detect underpriced vehicles as soon as they are listed with recurring collections.',
    ],
    resultFr: 'Reperez les vehicules sous-cotes en quelques heures et proposez des prix competitifs.',
    resultEn: 'Spot underpriced vehicles within hours and offer competitive prices.',
    audienceFr: 'Concessionnaires, revendeurs, particuliers',
    audienceEn: 'Dealers, resellers, individuals',
  },
  {
    slugFr: 'etudes-de-marche',
    slugEn: 'market-research',
    icon: BarChart3,
    titleFr: 'Etudes de marche',
    titleEn: 'Market Research',
    descFr: 'Collecte de donnees terrain a grande echelle pour alimenter vos analyses.',
    descEn: 'Large-scale field data collection to fuel your analyses.',
    heroSubFr: 'Collectez des donnees terrain a grande echelle pour alimenter vos analyses sectorielles.',
    heroSubEn: 'Collect field data at scale to fuel your industry analyses.',
    problemFr: 'Les cabinets de conseil et chercheurs ont besoin de donnees terrain fraiches mais les methodes traditionnelles sont lentes et couteuses.',
    problemEn: 'Consulting firms and researchers need fresh field data but traditional methods are slow and expensive.',
    solutionFr: [
      'Collectez des milliers de publications et annonces en quelques minutes.',
      "Analysez l'engagement, les tendances de contenu et le sentiment avec l'IA.",
      'Comparez plusieurs marques ou secteurs avec le benchmark concurrentiel.',
    ],
    solutionEn: [
      'Collect thousands of posts and listings in minutes.',
      'Analyze engagement, content trends and sentiment with AI.',
      'Compare multiple brands or industries with competitive benchmarking.',
    ],
    resultFr: 'Alimentez vos etudes avec des donnees terrain fraiches et structurees.',
    resultEn: 'Feed your studies with fresh, structured field data.',
    audienceFr: 'Cabinets conseil, chercheurs, analystes sectoriels',
    audienceEn: 'Consulting firms, researchers, industry analysts',
  },
];

export function findUseCase(slug: string): UseCase | undefined {
  return useCases.find((uc) => uc.slugFr === slug || uc.slugEn === slug);
}
