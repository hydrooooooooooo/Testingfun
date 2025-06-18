import { ApifyClient } from 'apify-client';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import fs from 'fs';
import path from 'path';

/**
 * Script to get raw data from Apify dataset without any transformation
 * This will help us understand the actual structure of the data
 */
async function getRawApifyData() {
  try {
    // Initialize Apify client
    const apifyClient = new ApifyClient({
      token: config.api.apifyToken,
    });

    // Use the existing dataset ID from the session
    const datasetId = "ttRRtMbZgZ9WD0ZXG";
    const limit = 5; // Number of items to retrieve
    
    logger.info('Getting raw data from Apify dataset', { datasetId, limit });
    
    // Get raw items without field filtering
    const { items } = await apifyClient.dataset(datasetId).listItems({
      limit,
      // Don't specify fields to get all available fields
    });
    
    logger.info(`Retrieved ${items.length} raw items`);
    
    // Save raw results to a file for inspection
    const resultsPath = path.join(__dirname, '../../data/raw_apify_data.json');
    fs.writeFileSync(resultsPath, JSON.stringify(items, null, 2));
    
    logger.info(`Raw data saved to ${resultsPath}`);
    
    // Log the keys of the first item to see what fields are available
    if (items.length > 0) {
      const firstItem = items[0];
      logger.info('Available fields in first item:', Object.keys(firstItem));
      
      // Log a sample of the first item
      logger.info('First item sample:', JSON.stringify(firstItem, null, 2));
    }
    
    return { success: true, itemCount: items.length };
  } catch (error) {
    logger.error('Error getting raw Apify data:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Run the script
getRawApifyData()
  .then(result => {
    logger.info('Script completed', { success: result.success });
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    logger.error('Unexpected error:', error);
    process.exit(1);
  });
