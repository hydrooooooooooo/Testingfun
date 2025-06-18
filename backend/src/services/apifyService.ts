import { ApifyClient } from 'apify-client';
import { logger } from '../utils/logger';
import { config } from '../config/config';

// Define types for Apify data structure
interface ApifyItemAttribute {
  name: string;
  value: string;
}

interface ApifyLocationDetail {
  city?: string;
  state?: string;
  postal_code?: string;
}

interface ApifyLocation {
  latitude?: number;
  longitude?: number;
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

interface ApifyListingPrice {
  amount?: string | number;
  currency?: string;
  formatted_amount?: string;
}

interface ApifyListingImage {
  uri?: string;
}

interface ApifyPrimaryListingPhoto {
  listing_image?: ApifyListingImage;
  image?: ApifyListingImage;
  id?: string;
}

interface ApifyDescriptionObject {
  text?: string;
  [key: string]: any;
}

interface ApifyItem {
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
  listing_photos?: Array<{image: {uri: string}}>;
  [key: string]: any;
}

// Initialize Apify client
const apifyClient = new ApifyClient({
  token: config.api.apifyToken,
});

export class ApifyService {
  /**
   * Validate Apify configuration
   */
  private validateConfig() {
    if (!config.api.apifyToken) {
      throw new Error('APIFY_TOKEN manquant dans .env');
    }
    if (!config.api.apifyActorId) {
      throw new Error('APIFY_ACTOR_ID manquant dans .env');
    }
    logger.info('Configuration Apify validée', {
      actorId: config.api.apifyActorId,
      tokenPrefix: config.api.apifyToken?.substring(0, 5) + '...',
    });
  }

  /**
   * Valider et nettoyer les données extraites
   */
  private validateAndCleanData(item: any): any {
    // Filtrer les prix aberrants
    if (item.price && item.price.includes('MGA')) {
      const amount = parseFloat(item.price.replace(/[^\d]/g, ''));
      if (amount < 1000) {
        item.price = 'Prix à négocier';
      }
    }
    
    // S'assurer que la description n'est pas vide
    if (!item.desc || item.desc === 'No Description') {
      item.desc = 'Description non disponible';
    }
    
    // Valider l'URL de l'image
    if (item.image && !item.image.startsWith('http')) {
      item.image = '';
    }
    
    return item;
  }

  /**
   * Get actor ID to use for scraping
   */
  private getActorIdFromUrl(url: string): string {
    // Pour l'instant, on utilise l'ID d'acteur configuré
    return config.api.apifyActorId || '';
  }

  /**
   * Start a scraping job on APIFY
   */
  async startScraping(
    url: string, 
    sessionId: string, 
    resultsLimit: number = 3,
    options: {
      deepScrape?: boolean;
      getProfileUrls?: boolean;
    } = {}
  ): Promise<{ datasetId: string; actorRunId: string }> {
    try {
      this.validateConfig();
      
      const actorId = this.getActorIdFromUrl(url);
      
      logger.info(`Starting APIFY scraping job for URL: ${url} with actor: ${actorId}`, { 
        sessionId, 
        resultsLimit, 
        deepScrape: options.deepScrape,
        getProfileUrls: options.getProfileUrls 
      });
      
      // Configuration selon le format attendu par l'acteur Facebook Marketplace
      const input: any = {
        urls: [url],
        count: resultsLimit,
        deepScrape: options.deepScrape !== undefined ? options.deepScrape : (resultsLimit > 5),
        getProfileUrls: options.getProfileUrls !== undefined ? options.getProfileUrls : false,
        proxy: {
          useApifyProxy: true,
          apifyProxyGroups: ["RESIDENTIAL"]
        }
      };
      
      logger.info(`Configuration du scraper avec limite de ${resultsLimit} résultats`);
      logger.info('Configuration du scraper', { input });

      // Lancer l'acteur en mode asynchrone sans attendre la fin du job
      const runResult = await apifyClient.actor(actorId).start(input, {
        memory: 2048,
        build: 'latest',
        waitForFinish: 10 // Attendre seulement 10 secondes pour le démarrage
      });
      
      // Convert to the expected structure
      const run = {
        id: runResult.id,
        defaultDatasetId: runResult.defaultDatasetId,
        status: runResult.status
      };

      logger.info(`APIFY job started successfully:`, { 
        runId: run.id, 
        datasetId: run.defaultDatasetId,
        status: run.status 
      });
      
      return {
        datasetId: run.defaultDatasetId,
        actorRunId: run.id
      };
    } catch (error) {
      logger.error('Error starting APIFY scraping job:', error);
      throw new Error(`Failed to start scraping: ${(error as Error).message}`);
    }
  }

  /**
   * Get the status of a scraping job
   */
  async getRunStatus(actorRunId: string): Promise<{ status: string; progress: number }> {
    try {
      const run = await apifyClient.run(actorRunId).get();
      
      let progress = 0;
      let status = 'UNKNOWN';
      
      if (run && run.status) {
        status = run.status;
        
        if (status === 'SUCCEEDED') {
          progress = 100;
        } else if (status === 'RUNNING' && run.startedAt) {
          const startedAt = new Date(run.startedAt).getTime();
          const now = Date.now();
          const elapsed = now - startedAt;
          progress = Math.min(Math.floor((elapsed / (2 * 60 * 1000)) * 100), 99);
        }
      }
      
      return {
        status,
        progress
      };
    } catch (error) {
      logger.error(`Error getting run status for ${actorRunId}:`, error);
      return {
        status: 'ERROR',
        progress: 0
      };
    }
  }

  /**
   * Get dataset items
   */
  async getDatasetItems(datasetId: string, limit: number | null = null): Promise<any[]> {
    try {
      const options: any = {};
      if (limit) {
        options.limit = limit;
      }
      
      const { items } = await apifyClient.dataset(datasetId).listItems(options);
      return items.map((item: ApifyItem) => this.extractItemData(item));
    } catch (error) {
      logger.error(`Error getting dataset items for ${datasetId}:`, error);
      throw new Error(`Failed to get dataset items: ${(error as Error).message}`);
    }
  }

  /**
   * Test Apify connection
   */
  async testApifyConnection(): Promise<boolean> {
    try {
      this.validateConfig();
      
      const { items } = await apifyClient.actors().list({
        limit: 1
      });
      
      if (items && items.length > 0) {
        const actor = items[0];
        logger.info('Apify connection successful', { 
          actorName: actor.name
        });
        return true;
      } else {
        logger.warn('Apify connection successful but no actors found');
        return true;
      }
    } catch (error) {
      logger.error('Apify connection test failed:', error);
      return false;
    }
  }

  /**
   * Extract and clean item data from raw Apify response
   */
  private extractItemData(item: ApifyItem): any {
    // 1. Extraction du titre depuis les champs appropriés
    let title = '';
    if (item.marketplace_listing_title) {
      title = item.marketplace_listing_title;
    } else if (item.custom_title) {
      title = item.custom_title;
    } else if (item.title) {
      title = item.title;
    } else if (item.name) {
      title = item.name;
    }
    
    // 2. Extraction du prix avec devise - Version corrigée
    let price = 'N/A';
    if (item.listing_price && item.listing_price.amount !== undefined) {
      let amount: number;
      if (typeof item.listing_price.amount === 'string') {
        amount = parseFloat(item.listing_price.amount);
      } else {
        amount = item.listing_price.amount;
      }
      
      const currency = item.listing_price.currency || 'MGA';
      if (!isNaN(amount) && amount > 0) {
        if (currency === 'MGA') {
          price = `${amount.toLocaleString('fr-FR')} MGA`;
        } else if (currency === 'USD') {
          price = `$${amount.toLocaleString('fr-FR')}`;
        } else {
          price = `${amount.toLocaleString('fr-FR')} ${currency}`;
        }
      }
    }
    // Vérifier les autres champs de prix possibles
    else if (item.price) {
      if (typeof item.price === 'number') {
        price = `${item.price.toLocaleString('fr-FR')} EUR`;
      } else {
        price = item.price;
      }
    } else if (item.prix) {
      if (typeof item.prix === 'number') {
        price = `${item.prix.toLocaleString('fr-FR')} EUR`;
      } else {
        price = item.prix;
      }
    }
    
    // 3. Extraction de la description - Version corrigée
    let description = '';
    if (item.redacted_description && typeof item.redacted_description === 'object' && item.redacted_description.text) {
      description = item.redacted_description.text;
    } else if (item.redacted_description && typeof item.redacted_description === 'string') {
      description = item.redacted_description;
    } else if (item.description) {
      description = typeof item.description === 'string' ? item.description : '';
    }
    
    // 4. Extraction de l'image principale - Version corrigée
    let imageUrl = '';
    if (item.primary_listing_photo?.listing_image?.uri) {
      imageUrl = item.primary_listing_photo.listing_image.uri;
    } else if (item.primary_listing_photo?.image?.uri) {
      imageUrl = item.primary_listing_photo.image.uri;
    } else if (item.listing_photos && item.listing_photos.length > 0 && item.listing_photos[0].image?.uri) {
      imageUrl = item.listing_photos[0].image.uri;
    } else if (item.imageUrl && typeof item.imageUrl === 'string') {
      imageUrl = item.imageUrl;
    } else if (item.image) {
      if (typeof item.image === 'string') {
        imageUrl = item.image;
      } else if (typeof item.image === 'object' && item.image !== null && 'uri' in item.image) {
        imageUrl = (item.image as { uri: string }).uri;
      }
    }
    
    // S'assurer que l'URL de l'image est complète
    if (imageUrl && !imageUrl.startsWith('http')) {
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      } else if (imageUrl.startsWith('/')) {
        const listingUrl = item.listingUrl || item.url || item.link || item.href;
        if (listingUrl && typeof listingUrl === 'string') {
          try {
            const urlObj = new URL(listingUrl);
            imageUrl = `${urlObj.protocol}//${urlObj.hostname}${imageUrl}`;
          } catch (e) {
            // En cas d'erreur, laisser l'URL telle quelle
          }
        }
      }
    }
    
    // 5. Extraction de la localisation - Version corrigée
    let locationStr = 'Unknown';
    if (item.location) {
      if (typeof item.location === 'string') {
        locationStr = item.location;
      } else if (typeof item.location === 'object' && item.location !== null) {
        const loc = item.location as ApifyLocation;
        // Vérifier reverse_geocode_detailed en premier
        if (loc.reverse_geocode_detailed?.city) {
          locationStr = loc.reverse_geocode_detailed.city;
        }
        // Puis reverse_geocode
        else if (loc.reverse_geocode?.city) {
          locationStr = loc.reverse_geocode.city;
        }
        // Puis city_page display_name
        else if (loc.reverse_geocode?.city_page?.display_name) {
          // Extraire juste la ville du format "Ville, Pays"
          const displayName = loc.reverse_geocode.city_page.display_name;
          locationStr = displayName.split(',')[0].trim();
        }
      }
    } else if (item.lieu) {
      locationStr = item.lieu;
    }
    
    // 6. Extraction de l'URL de l'annonce
    let url = '';
    if (item.listingUrl) {
      url = item.listingUrl;
    } else if (item.url) {
      url = item.url;
    } else if (item.link) {
      url = item.link;
    } else if (item.href) {
      url = item.href;
    }
    
    // 7. Extraction de la date
    let postedAt = '';
    if (item.postedAt) {
      postedAt = item.postedAt;
    } else if (item.date) {
      postedAt = item.date;
    }
    
    const extractedItem = {
      title: title || 'No Title',
      price: price,
      desc: description || 'No Description',
      image: imageUrl,
      location: locationStr,
      url: url,
      postedAt: postedAt
    };
    
    return this.validateAndCleanData(extractedItem);
  }

  /**
   * Get preview items from a dataset
   */
  async getPreviewItems(datasetId: string, limit: number = 3): Promise<any[]> {
    try {
      logger.info(`Récupération de ${limit} éléments de prévisualisation depuis le dataset ${datasetId}`);
      
      // Récupérer exactement le nombre d'éléments demandés
      const { items } = await apifyClient.dataset(datasetId).listItems({
        limit: limit,
      });
      
      logger.info(`Retrieved ${items.length} preview items from dataset ${datasetId}`);
      
      return items.map((item: ApifyItem) => this.extractItemData(item));
    } catch (error) {
      logger.error(`Error getting preview items for dataset ${datasetId}:`, error);
      throw new Error(`Failed to get preview items: ${(error as Error).message}`);
    }
  }
}

export const apifyService = new ApifyService();