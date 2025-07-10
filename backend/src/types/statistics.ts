export interface Statistics {
  totalAds: number;
  averagePrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  locationDistribution: Record<string, number>;
}
