/**
 * Type definitions for Apify data structure
 */

export interface ApifyItemAttribute {
  name: string;
  value: string;
}

export interface ApifyLocationDetail {
  city?: string;
  state?: string;
  postal_code?: string;
}

export interface ApifyLocation {
  latitude?: number;
  longitude?: number;
  reverse_geocode_detailed?: ApifyLocationDetail;
  [key: string]: any;
}

export interface ApifyListingPrice {
  amount?: string;
  currency?: string;
}

export interface ApifyListingImage {
  uri?: string;
}

export interface ApifyPrimaryListingPhoto {
  listing_image?: ApifyListingImage;
  id?: string;
}

export interface ApifyDescriptionObject {
  text?: string;
  [key: string]: any;
}

export interface ApifyItem {
  // Standard fields we were using before
  title?: string;
  price?: string;
  description?: string;
  imageUrl?: string;
  location?: string | ApifyLocation;
  url?: string;
  postedAt?: string;
  attributes?: ApifyItemAttribute[];
  
  // New fields from raw data
  id?: string;
  marketplace_listing_title?: string;
  custom_title?: string;
  listing_price?: ApifyListingPrice;
  redacted_description?: string | ApifyDescriptionObject;
  primary_listing_photo?: ApifyPrimaryListingPhoto;
  listingUrl?: string;
  listing_photos?: Array<{image: {uri: string}}>;  
  [key: string]: any;
}
