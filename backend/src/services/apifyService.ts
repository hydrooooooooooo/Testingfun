import { ApifyClient } from 'apify-client';
import db from '../database';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import {
  ApifyItem,
  ApifyLocation,
  ApifyItemAttribute,
  ApifyLocationDetail,
  ApifyListingPrice,
  ApifyListingImage,
  ApifyDescriptionObject,
  ApifyPrimaryListingPhoto
} from '../types/apifyTypes';

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
    
    // Nettoyer et limiter les images (max 3) et synchroniser le champ image principal
    const asArray = (arr: any) => Array.isArray(arr) ? arr : [];
    const rawImages: string[] = asArray(item.images);
    let cleanedImages = rawImages
      .filter((u) => typeof u === 'string' && u.length > 0)
      .map((u) => {
        if (u.startsWith('//')) return 'https:' + u;
        if (u.startsWith('/')) return '';
        return u;
      })
      .filter((u) => u.startsWith('http'));
    // Dédupliquer
    cleanedImages = Array.from(new Set(cleanedImages)).slice(0, 3);
    item.images = cleanedImages;
    // Valider l'URL de l'image principale
    if (item.image && !item.image.startsWith('http')) {
      item.image = '';
    }
    // Si pas d'image principale, prendre la première de la liste
    if ((!item.image || item.image === '') && cleanedImages.length > 0) {
      item.image = cleanedImages[0];
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
    } = {}
  ): Promise<{ datasetId: string; actorRunId: string }> {
    try {
      this.validateConfig();

      const actorId = this.getActorIdFromUrl(url);

      logger.info(`Starting APIFY scraping job for URL: ${url} with actor: ${actorId}`, {
        sessionId,
        resultsLimit,
        deepScrape: options.deepScrape,
      });
      
      // Configuration selon le format attendu par l'acteur Facebook Marketplace
      const input: any = {
        urls: [url],
        count: resultsLimit,
        deepScrape: options.deepScrape !== undefined ? options.deepScrape : true,
        strictFiltering: true,
        proxy: {
          useApifyProxy: true,
          apifyProxyGroups: ["RESIDENTIAL"]
        }
      };
      
      logger.info(`Configuration du scraper avec limite de ${resultsLimit} résultats`);
      logger.info('Configuration du scraper', { input });

      // Préparer webhook pour fin de run (succès/échec)
      // 1) Privilégier APIFY_WEBHOOK_URL si défini (doit être https public)
      // 2) Sinon, utiliser BACKEND_URL uniquement s'il est en https
      const explicitWebhookBase = process.env.APIFY_WEBHOOK_URL || '';
      const backendUrl = config.server.backendUrl || '';
      const isHttps = (u: string) => typeof u === 'string' && /^https:\/\//i.test(u);
      const chosenBase = isHttps(explicitWebhookBase)
        ? explicitWebhookBase
        : (isHttps(backendUrl) ? backendUrl : '');
      const hasWebhook = chosenBase.length > 0;
      const webhookUrl = hasWebhook ? `${chosenBase.replace(/\/$/, '')}/api/scrape/webhook` : '';
      const payloadTemplate = `{"sessionId":"${sessionId}","resource":{{resource}},"eventData":{{eventData}}}`;

      const startOptions: any = {
        memory: 2048,
        build: 'latest',
        waitForFinish: 30, // Attendre un peu plus pour capter les runs rapides
      };
      if (hasWebhook) {
        startOptions.webhooks = [
          {
            eventTypes: [
              'ACTOR.RUN.SUCCEEDED',
              'ACTOR.RUN.FAILED',
              'ACTOR.RUN.TIMED_OUT',
              'ACTOR.RUN.ABORTED',
            ],
            requestUrl: webhookUrl,
            payloadTemplate,
            idempotencyKey: `sess_${sessionId}`,
          } as any,
        ];
      } else {
        logger.warn('Skipping Apify webhook registration (no https endpoint). Set APIFY_WEBHOOK_URL=https://... or BACKEND_URL=https://...', { backendUrl, explicitWebhookBase });
      }

      // Lancer l'acteur en mode asynchrone avec timeout
      const APIFY_START_TIMEOUT_MS = 60_000; // 60 seconds
      let runResult: any;
      try {
        runResult = await Promise.race([
          apifyClient.actor(actorId).start(input, startOptions),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Apify actor start timed out after 60s')), APIFY_START_TIMEOUT_MS)
          ),
        ]);
      } catch (startError: any) {
        if (startError.message?.includes('timed out')) {
          logger.error(`Apify start timeout for session ${sessionId}`, { url, actorId });
          throw new Error('Le lancement du scraping a pris trop de temps. Veuillez réessayer.');
        }
        throw startError;
      }

      // Convert to the expected structure
      const run = {
        id: runResult.id,
        defaultDatasetId: runResult.defaultDatasetId,
        status: runResult.status
      };

      logger.info(`APIFY job started successfully:`, { 
        runId: run.id, 
        datasetId: run.defaultDatasetId,
        status: run.status, 
        webhookUrl: hasWebhook ? webhookUrl : null
      });

      // Enregistrer l'URL dans la session
      await db('scraping_sessions').where({ id: sessionId }).update({ url: url });
      
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
  async getRunStatus(actorRunId: string): Promise<{ status: string; progress: number; startedAt?: string; finishedAt?: string; runtimeMs?: number }> {
    try {
      const run = await apifyClient.run(actorRunId).get();
      
      let progress = 0;
      let status = 'UNKNOWN';
      let startedAt: string | undefined;
      let finishedAt: string | undefined;
      let runtimeMs: number | undefined;
      
      if (run && run.status) {
        status = run.status;
        if (run.startedAt) startedAt = run.startedAt as unknown as string;
        if (run.finishedAt) finishedAt = run.finishedAt as unknown as string;
        if (run.startedAt) {
          const start = new Date(run.startedAt).getTime();
          const end = run.finishedAt ? new Date(run.finishedAt as unknown as string).getTime() : Date.now();
          runtimeMs = Math.max(0, end - start);
        }
        
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
        progress,
        startedAt,
        finishedAt,
        runtimeMs,
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
    const DATASET_TIMEOUT_MS = 30_000; // 30 seconds
    try {
      const options: any = {};
      if (limit) {
        options.limit = limit;
      }

      const result = await Promise.race([
        apifyClient.dataset(datasetId).listItems(options),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Dataset fetch timed out after ${DATASET_TIMEOUT_MS / 1000}s`)), DATASET_TIMEOUT_MS)
        ),
      ]);

      return result.items.map((item: ApifyItem) => this.extractItemData(item));
    } catch (error) {
      logger.error(`Error getting dataset items for ${datasetId}:`, error);
      throw new Error(`Failed to get dataset items: ${(error as Error).message}`);
    }
  }

  /**
   * Delete an Apify dataset to free storage after export
   */
  async deleteDataset(datasetId: string): Promise<void> {
    try {
      await apifyClient.dataset(datasetId).delete();
      logger.info(`Apify dataset ${datasetId} deleted successfully`);
    } catch (error) {
      // Non-critical: log but don't throw
      logger.warn(`Failed to delete Apify dataset ${datasetId}:`, error);
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
    
    // 4. Extraction d'images (jusqu'à 3) et de l'image principale
    let imageUrl = '';
    const images: string[] = [];
    // Image principale
    if (item.primary_listing_photo?.listing_image?.uri) {
      images.push(item.primary_listing_photo.listing_image.uri);
    } else if (item.primary_listing_photo?.image?.uri) {
      images.push(item.primary_listing_photo.image.uri);
    }
    // Autres photos
    if (Array.isArray(item.listing_photos)) {
      for (const p of item.listing_photos) {
        const uri = p?.image?.uri;
        if (typeof uri === 'string') images.push(uri);
      }
    }
    // Champs alternatifs simples
    if (typeof item.imageUrl === 'string') images.push(item.imageUrl);
    if (item.image) {
      if (typeof item.image === 'string') images.push(item.image);
      else if (typeof item.image === 'object' && item.image !== null && 'uri' in item.image) {
        images.push((item.image as { uri: string }).uri);
      }
    }
    // Déduplication simple tout en préservant l'ordre, et nettoyage basique
    const seen = new Set<string>();
    const fixedImages: string[] = [];
    for (let u of images) {
      if (typeof u !== 'string' || u.length === 0) continue;
      if (u.startsWith('//')) u = 'https:' + u;
      if (!seen.has(u)) {
        seen.add(u);
        fixedImages.push(u);
      }
      if (fixedImages.length >= 3) break;
    }
    imageUrl = fixedImages[0] || '';
    
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
      images: fixedImages,
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