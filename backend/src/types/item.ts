export interface Item {
  title?: string;
  price?: string;
  locationInfo?: {
    location?: string;
  };
  sellerInfo?: {
    name?: string;
  };
  url: string;
  image?: string;
}

export interface EnrichedItem extends Item {
  googleInfo: {
    rating?: number;
    international_phone_number?: string;
    website?: string;
  } | null;
}
