import { logger } from '../utils/logger';
import { ApifyService } from '../services/apifyService';
import { sessionService } from '../services/sessionService';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test script to verify the improved extraction logic with the Apify client
 * This script connects to Apify, retrieves data, and processes it with our improved extraction logic
 */
async function testApifyExtraction() {
  try {
    // Check if Apify token is available
    const apifyToken = process.env.APIFY_TOKEN;
    const apifyActorId = process.env.APIFY_ACTOR_ID;
    
    if (!apifyToken || !apifyActorId) {
      logger.error('Missing APIFY_TOKEN or APIFY_ACTOR_ID environment variables');
      return;
    }
    
    logger.info('Initializing Apify service with token and actor ID');
    const apifyService = new ApifyService();
    
    // Test connection to Apify
    logger.info('Testing connection to Apify...');
    const isConnected = await apifyService.testApifyConnection();
    
    if (!isConnected) {
      logger.error('Failed to connect to Apify');
      return;
    }
    
    logger.info('Successfully connected to Apify');
    
    // Use a dataset ID from environment or a hardcoded test dataset ID
    // You can get this ID from a previous run or from the Apify console
    const datasetId = process.env.APIFY_TEST_DATASET_ID || 'ttRRtMbZgZ9WD0ZXG';
    logger.info(`Using dataset ID: ${datasetId}`);
    
    // Get preview items with improved extraction
    logger.info('Getting preview items with improved extraction...');
    const previewItems = await apifyService.getPreviewItems(datasetId, 5);
    
    // Log sample items
    logger.info(`Retrieved ${previewItems.length} preview items`);
    logger.info('Sample preview items:');
    previewItems.slice(0, 3).forEach((item, index) => {
      logger.info(`Item ${index + 1}:`);
      logger.info(`  Title: ${item.title}`);
      logger.info(`  Price: ${item.price}`);
      logger.info(`  Description: ${item.desc?.substring(0, 100)}...`);
      logger.info(`  Image: ${item.image}`);
      logger.info(`  Location: ${item.location}`);
      logger.info(`  URL: ${item.url}`);
      logger.info('---');
    });
    
    // Create or update a test session with the preview items
    const sessionId = 'apify-test-session';
    const existingSession = await sessionService.getSession(sessionId);
    
    if (existingSession) {
      // Update existing session
      logger.info(`Updating existing session ${sessionId} with ${previewItems.length} items`);
      
      // Store preview items in session data field
      if (!existingSession.data) {
        existingSession.data = {};
      }
      existingSession.data.previewItems = previewItems;
      existingSession.data.datasetId = datasetId;
      
      await sessionService.updateSession(sessionId, existingSession);
      logger.info(`Session ${sessionId} updated successfully`);
    } else {
      // Create new session
      logger.info(`Creating new session ${sessionId} with ${previewItems.length} items`);
      
      await sessionService.createSession({
        id: sessionId,
        url: 'https://www.facebook.com/marketplace/category/propertyrentals',
        createdAt: new Date(),
        status: 'completed',
        isPaid: false,
        data: {
          previewItems,
          datasetId
        }
      });
      
      logger.info(`Session ${sessionId} created successfully`);
    }
    
    logger.info('Test completed successfully');
    
  } catch (error) {
    logger.error('Error testing Apify extraction:', error);
  }
}

// Run the test
testApifyExtraction();
