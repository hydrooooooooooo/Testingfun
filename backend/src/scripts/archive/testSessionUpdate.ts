import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { ApifyItem } from '../types/apifyTypes';
import { sessionService, Session } from '../services/sessionService';

/**
 * Test script to update a session with extracted items
 * This script processes raw data, applies our extraction logic, and updates a session
 */
async function testSessionUpdate() {
  try {
    // Use the imported sessionService instance
    
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
    
    // Check if a test session exists
    const sessionId = 'test-session';
    const existingSession = await sessionService.getSession(sessionId);
    
    if (existingSession) {
      // Update existing session with processed items
      logger.info(`Updating existing session ${sessionId} with ${processedItems.length} items`);
      
      // Store preview items in session data field
      if (!existingSession.data) {
        existingSession.data = {};
      }
      existingSession.data.previewItems = processedItems;
      
      await sessionService.updateSession(sessionId, existingSession);
      logger.info(`Session ${sessionId} updated successfully`);
    } else {
      // Create new session with processed items
      logger.info(`Creating new session ${sessionId} with ${processedItems.length} items`);
      
      const newSession: Session = {
        id: sessionId,
        url: 'https://www.facebook.com/marketplace/category/propertyrentals',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'completed',
        data: {
          previewItems: processedItems
        },
        isPaid: false
      };
      
      await sessionService.createSession(newSession);
      logger.info(`Session ${sessionId} created successfully`);
    }
    
    logger.info('Test completed successfully');
    
  } catch (error) {
    logger.error('Error updating session:', error);
  }
}

// Run the test
testSessionUpdate();
