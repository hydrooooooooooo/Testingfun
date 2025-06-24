/**
 * Type definitions for Apify data structure - Enhanced Version
 */

export interface ApifyItemAttribute {
  name: string;
  value: string;
  attribute_name?: string;
  label?: string;
}

export interface ApifyLocationDetail {
  city?: string;
  state?: string;
  postal_code?: string;
}

export interface ApifyCoordinates {
  latitude?: number;
  longitude?: number;
}

export interface ApifyLocation extends ApifyCoordinates {
  reverse_geocode_detailed?: ApifyLocationDetail;
  reverse_geocode?: {
    city?: string;
    state?: string;
    city_page?: {
      display_name?: string;
      id?: string;
    };
  };
  [key: string]: any;
}

export interface ApifyListingPrice {
  amount?: string | number;
  currency?: string;
  formatted_amount?: string;
  formatted_amount_zeros_stripped?: string;
  amount_with_offset_in_currency?: string;
}

export interface ApifyListingImage {
  uri?: string;
  height?: number;
  width?: number;
}

export interface ApifyListingPhoto {
  image: ApifyListingImage;
  accessibility_caption?: string;
  id?: string;
}

export interface ApifyPrimaryListingPhoto {
  listing_image?: ApifyListingImage;
  image?: ApifyListingImage;
  id?: string;
}

export interface ApifyDescriptionObject {
  text?: string;
  [key: string]: any;
}

export interface ApifyProductItem {
  id?: string;
  boosted_marketplace_listing?: any;
  promoted_listing?: any;
}

export interface ApifyMarketplaceCategory {
  slug?: string;
  id?: string;
  name?: string;
}

export interface ApifyProcessedItem {
  // Identifiants
  id: string;
  listing_id?: string;
  product_id?: string;
  
  // Informations principales
  title: string;
  price: string;
  description: string;
  
  // Images
  image: string; // Image principale
  all_images: string[]; // Toutes les images
  
  // Localisation
  location: string;
  coordinates?: ApifyCoordinates;
  
  // URLs et liens
  url: string;
  
  // Dates
  date: string;
  created_at?: string;
  
  // Caractéristiques
  attributes: ApifyItemAttribute[];
  
  // Informations sur la catégorie
  category?: {
    name: string;
    slug: string;
    id: string;
  };
  
  // Statuts
  is_live?: boolean;
  is_pending?: boolean;
  is_sold?: boolean;
  
  // Informations sur la devise et le formatage
  currency?: string;
  original_price?: {
    amount: number;
    currency: string;
  };
  
  // Données brutes pour debug
  raw?: any;
}

export interface ApifyItem {
  // Standard fields we were using before
  title?: string;
  name?: string;
  price?: string | number;
  prix?: string | number;
  description?: string;
  desc?: string;
  imageUrl?: string;
  image?: string | { uri: string };
  img?: string;
  thumbnail?: string;
  location?: string | ApifyLocation;
  lieu?: string;
  url?: string;
  link?: string;
  href?: string;
  uri?: string;
  postedAt?: string;
  date?: string;
  attributes?: ApifyItemAttribute[];
  
  // New fields from raw data
  id?: string;
  marketplace_listing_title?: string;
  custom_title?: string;
  listing_price?: ApifyListingPrice;
  redacted_description?: string | ApifyDescriptionObject;
  primary_listing_photo?: ApifyPrimaryListingPhoto;
  listingUrl?: string;
  listing_photos?: ApifyListingPhoto[];
  
  // Additional extractable fields
  creation_time?: number;
  attribute_data?: ApifyItemAttribute[];
  product_item?: ApifyProductItem;
  marketplace_listing_category?: ApifyMarketplaceCategory;
  marketplace_listing_category_name?: string;
  
  // Status fields
  is_live?: boolean;
  is_pending?: boolean;
  is_sold?: boolean;
  is_hidden?: boolean;
  
  // Enhanced location data
  item_location?: ApifyLocation;
  location_text?: {
    text?: string;
  };
  
  [key: string]: any;
}