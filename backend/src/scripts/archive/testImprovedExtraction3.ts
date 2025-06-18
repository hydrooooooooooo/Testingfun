import fs from 'fs';
import path from 'path';
import { apifyService } from '../services/apifyService';
import { sessionService, Session } from '../services/sessionService';
import { logger } from '../utils/logger';

/**
 * Test script to verify the improved extraction logic
 * This script will:
 * 1. Load a sample dataset ID from an existing session
 * 2. Run the improved extraction logic on it
 * 3. Save the results to a file for inspection
 * 4. Update the session with improved preview items
 */
async function testImprovedExtraction() {
  try {
    // Load existing raw data for testing
    const rawDataPath = path.join(__dirname, '../../data/raw_apify_data.json');
    const rawData = JSON.parse(fs.readFileSync(rawDataPath, 'utf8'));
    
    logger.info(`Loaded ${rawData.length} items from raw data file`);
    
    // Store the original dataset method
    const originalDataset = (apifyService as any).apifyClient.dataset;
    
    // Mock the Apify client's dataset method
    (apifyService as any).apifyClient.dataset = (datasetId: string) => ({
      listItems: () => Promise.resolve({ items: rawData })
    });
    
    // Log that we've mocked the Apify client
    logger.info('Mocked Apify client dataset method');
    
    // Test the improved extraction logic
    logger.info('Testing getPreviewItems with improved extraction...');
    const previewItems = await apifyService.getPreviewItems('test-dataset', 5);
    
    logger.info('Testing getAllItems with improved extraction...');
    const allItems = await apifyService.getAllItems('test-dataset');
    
    // Restore the original method
    (apifyService as any).apifyClient.dataset = originalDataset;
    
    // Save results for inspection
    const resultsPath = path.join(__dirname, '../../data/improved_extraction_results3.json');
    fs.writeFileSync(
      resultsPath,
      JSON.stringify({ previewItems, allItems: allItems.slice(0, 10) }, null, 2)
    );
    
    // Log sample items for quick inspection
    logger.info('Sample preview items:');
    previewItems.forEach((item, index) => {
      logger.info(`Item ${index + 1}:`);
      logger.info(`  Title: ${item.title}`);
      logger.info(`  Price: ${item.price}`);
      logger.info(`  Description: ${item.desc?.substring(0, 100)}...`);
      logger.info(`  Image: ${item.image}`);
      logger.info(`  Location: ${item.location}`);
      logger.info(`  URL: ${item.url}`);
      logger.info('---');
    });
    
    // Update a test session with the improved preview items
    const testSessionId = 'test-session-improved-extraction';
    const session = sessionService.getSession(testSessionId);
    if (session) {
      // Store preview items in the session's data field
      sessionService.updateSession(testSessionId, {
        data: { previewItems }
      });
      logger.info(`Updated test session ${testSessionId} with improved preview items`);
    } else {
      logger.info(`Creating new test session ${testSessionId} with improved preview items`);
      sessionService.createSession({
        id: testSessionId,
        url: 'https://www.facebook.com/marketplace/category/propertyrentals',
        status: 'completed',
        datasetId: 'test-dataset',
        actorRunId: 'test-run',
        data: { previewItems },
        createdAt: new Date(),
        isPaid: false
      } as Session);
    }
    
    logger.info(`Test completed successfully. Results saved to ${resultsPath}`);
    logger.info(`Found ${previewItems.length} preview items and ${allItems.length} total items`);
    
  } catch (error) {
    logger.error('Error testing improved extraction:', error);
  }
}

// Run the test
testImprovedExtraction();
