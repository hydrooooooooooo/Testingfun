import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { ApifyItem } from '../types/apifyTypes';

/**
 * Test script to verify the improved extraction logic directly
 * This script processes raw data and applies our extraction logic manually
 */
async function testExtraction() {
  try {
    // Load existing raw data for testing
    const rawDataPath = path.join(__dirname, '../../data/raw_apify_data.json');
    const rawData = JSON.parse(fs.readFileSync(rawDataPath, 'utf8'));
    
    logger.info(`Loaded ${rawData.length} items from raw data file`);
    
    // Process items with our extraction logic
    const processedItems = rawData.map((item: any) => {
      // Extraction du titre depuis les champs appropriés
      let title = item.marketplace_listing_title || item.custom_title;
      
      // Extraction du prix avec devise
      let price = 'N/A';
      if (item.listing_price && item.listing_price.amount) {
        const amount = parseFloat(item.listing_price.amount);
        const currency = item.listing_price.currency || '';
        // Format price with thousand separators
        price = amount.toLocaleString() + ' ' + currency;
      } else if (item.price) {
        // Fallback to the original price field if available
        price = item.price;
      }
      
      // Extraction de la description
      let description = '';
      if (item.redacted_description) {
        if (typeof item.redacted_description === 'string') {
          description = item.redacted_description;
        } else if (typeof item.redacted_description === 'object' && item.redacted_description !== null) {
          // Handle case where description is an object with a text property
          if ('text' in item.redacted_description && item.redacted_description.text) {
            description = item.redacted_description.text;
          }
        }
      }
      
      // Extraction de l'image principale
      let imageUrl = '';
      if (item.primary_listing_photo && item.primary_listing_photo.listing_image) {
        imageUrl = item.primary_listing_photo.listing_image.uri || '';
      } else if (item.listing_photos && item.listing_photos.length > 0 && item.listing_photos[0].image) {
        imageUrl = item.listing_photos[0].image.uri || '';
      }
      
      // Formatage de la localisation
      let locationStr = 'Unknown';
      if (item.location) {
        if (typeof item.location === 'string') {
          locationStr = item.location;
        } else {
          if (item.location.reverse_geocode_detailed && item.location.reverse_geocode_detailed.city) {
            locationStr = item.location.reverse_geocode_detailed.city;
            if (item.location.reverse_geocode_detailed.state) {
              locationStr += `, ${item.location.reverse_geocode_detailed.state}`;
            }
          }
        }
      }
      
      return {
        title: title || 'No Title',
        price: price,
        desc: description || 'No Description',
        image: imageUrl,
        location: locationStr,
        url: item.listingUrl || '',
        postedAt: item.postedAt || ''
      };
    });
    
    // Save results for inspection
    const resultsPath = path.join(__dirname, '../../data/direct_extraction_results.json');
    fs.writeFileSync(
      resultsPath,
      JSON.stringify(processedItems, null, 2)
    );
    
    // Log sample items for quick inspection
    logger.info('Sample processed items:');
    processedItems.slice(0, 3).forEach((item: any, index: number) => {
      logger.info(`Item ${index + 1}:`);
      logger.info(`  Title: ${item.title}`);
      logger.info(`  Price: ${item.price}`);
      logger.info(`  Description: ${item.desc?.substring(0, 100)}...`);
      logger.info(`  Image: ${item.image}`);
      logger.info(`  Location: ${item.location}`);
      logger.info(`  URL: ${item.url}`);
      logger.info('---');
    });
    
    logger.info(`Test completed successfully. Results saved to ${resultsPath}`);
    logger.info(`Processed ${processedItems.length} items`);
    
  } catch (error) {
    logger.error('Error testing extraction:', error);
  }
}

// Run the test
testExtraction();
