import { logger } from '../../utils/logger';
import { apifyService } from '../../services/apifyService';
import { sessionService } from '../../services/sessionService';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test script to verify the full workflow from starting a scraping job to retrieving results
 * This script demonstrates the complete process used in production
 */
async function testFullWorkflow() {
  try {
    // Check if Apify token is available
    const apifyToken = process.env.APIFY_TOKEN;
    const apifyActorId = process.env.APIFY_ACTOR_ID;
    
    if (!apifyToken || !apifyActorId) {
      logger.error('Missing APIFY_TOKEN or APIFY_ACTOR_ID environment variables');
      return;
    }
    
    logger.info('Starting full workflow test');
    
    // Test connection to Apify
    logger.info('Testing connection to Apify...');
    const isConnected = await apifyService.testApifyConnection();
    
    if (!isConnected) {
      logger.error('Failed to connect to Apify');
      return;
    }
    
    logger.info('Successfully connected to Apify');
    
    // Create a unique session ID for this test
    const sessionId = `test-full-workflow-${Date.now()}`;
    const testUrl = 'https://www.facebook.com/marketplace/category/propertyrentals';
    const resultsLimit = 5; // Limit to 5 results for testing
    
    // Start a scraping job
    logger.info(`Starting scraping job for URL: ${testUrl}`);
    const { datasetId, actorRunId } = await apifyService.startScraping(testUrl, sessionId, resultsLimit);
    
    logger.info(`Scraping job started with dataset ID: ${datasetId} and actor run ID: ${actorRunId}`);
    
    // Poll for job status until complete
    let status = '';
    let progress = 0;
    let attempts = 0;
    const maxAttempts = 30; // Maximum number of polling attempts
    
    logger.info('Polling for job status...');
    
    while (status !== 'SUCCEEDED' && status !== 'FAILED' && status !== 'ABORTED' && attempts < maxAttempts) {
      attempts++;
      
      const runStatus = await apifyService.getRunStatus(actorRunId);
      status = runStatus.status;
      progress = runStatus.progress;
      
      logger.info(`Attempt ${attempts}: Status: ${status}, Progress: ${progress}%`);
      
      if (status !== 'SUCCEEDED' && status !== 'FAILED' && status !== 'ABORTED') {
        // Wait 5 seconds before polling again
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    if (status !== 'SUCCEEDED') {
      logger.error(`Scraping job did not complete successfully. Final status: ${status}`);
      return;
    }
    
    logger.info('Scraping job completed successfully');
    
    // Get preview items with improved extraction
    logger.info('Getting preview items with improved extraction...');
    const previewItems = await apifyService.getPreviewItems(datasetId, resultsLimit);
    
    // Log sample items
    logger.info(`Retrieved ${previewItems.length} preview items`);
    logger.info('Sample preview items:');
    previewItems.slice(0, 3).forEach((item: any, index: number) => {
      logger.info(`Item ${index + 1}:`);
      logger.info(`  Title: ${item.title}`);
      logger.info(`  Price: ${item.price}`);
      logger.info(`  Description: ${item.desc?.substring(0, 100)}...`);
      logger.info(`  Image: ${item.image}`);
      logger.info(`  Location: ${item.location}`);
      logger.info(`  URL: ${item.url}`);
      logger.info('---');
    });
    
    // Create a session with the preview items
    logger.info(`Creating session ${sessionId} with ${previewItems.length} items`);
    
    await sessionService.createSession({
      id: sessionId,
      url: testUrl,
      createdAt: new Date(),
      status: 'completed',
      isPaid: false,
      data: {
        previewItems,
        datasetId,
        actorRunId,
        totalItems: previewItems.length
      }
    });
    
    logger.info(`Session ${sessionId} created successfully`);
    
    // Get all items (in production this would be done when user pays)
    logger.info('Getting all items with improved extraction...');
    const allItems = await apifyService.getDatasetItems(datasetId);
    
    logger.info(`Retrieved ${allItems.length} total items`);
    logger.info(`First item: ${JSON.stringify(allItems[0], null, 2)}`);
    
    // Update the session with all items
    logger.info(`Updating session ${sessionId} with all items`);
    
    const session = await sessionService.getSession(sessionId);
    if (session) {
      if (!session.data) {
        session.data = {};
      }
      session.data.allItems = allItems;
      session.data.isPaid = true;
      
      await sessionService.updateSession(sessionId, session);
      logger.info(`Session ${sessionId} updated successfully with all items`);
    }
    
    logger.info('Full workflow test completed successfully');
    
  } catch (error) {
    logger.error('Error in full workflow test:', error);
  }
}

// Run the test
testFullWorkflow();
