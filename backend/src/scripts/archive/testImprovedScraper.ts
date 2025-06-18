import { apifyService } from '../../services/apifyService';
import { logger } from '../../utils/logger';
import fs from 'fs';
import path from 'path';

/**
 * Script to test the improved scraper configuration
 * This will start a new scraping job and retrieve the results
 */
async function testImprovedScraper() {
  try {
    // URL to scrape - using the same URL from the existing session
    const url = "https://www.facebook.com/marketplace/110080935687758/search/?query=appartement%20a%20louer";
    const sessionId = `test_session_${Date.now()}`;
    const resultsLimit = 10; // Increased limit for better testing
    
    logger.info('Starting test scraping job', { url, sessionId, resultsLimit });
    
    // Start the scraping job
    const { datasetId, actorRunId } = await apifyService.startScraping(url, sessionId, resultsLimit);
    logger.info('Scraping job started', { datasetId, actorRunId });
    
    // Wait for the job to complete (polling)
    let status = '';
    let progress = 0;
    let attempts = 0;
    const maxAttempts = 20;
    
    logger.info('Waiting for scraping job to complete...');
    
    while (status !== 'SUCCEEDED' && status !== 'FAILED' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between checks
      
      const runStatus = await apifyService.getRunStatus(actorRunId);
      status = runStatus.status;
      progress = runStatus.progress;
      
      logger.info(`Job status: ${status}, progress: ${progress}`, { attempts });
      attempts++;
    }
    
    if (status === 'SUCCEEDED') {
      logger.info('Scraping job completed successfully');
      
      // Get preview items
      const previewItems = await apifyService.getPreviewItems(datasetId, resultsLimit);
      logger.info(`Retrieved ${previewItems.length} preview items`);
      
      // Save results to a file for inspection
      const resultsPath = path.join(__dirname, '../../data/test_scraper_results.json');
      fs.writeFileSync(resultsPath, JSON.stringify(previewItems, null, 2));
      
      logger.info(`Results saved to ${resultsPath}`);
      
      // Log some sample data to verify quality
      if (previewItems.length > 0) {
        logger.info('Sample item:', { 
          title: previewItems[0].title,
          price: previewItems[0].price,
          desc: previewItems[0].desc?.substring(0, 100) + '...',
          location: previewItems[0].location
        });
      }
      
      return { success: true, datasetId, actorRunId, previewItems };
    } else {
      logger.error('Scraping job failed or timed out', { status, attempts });
      return { success: false, datasetId, actorRunId };
    }
  } catch (error) {
    logger.error('Error testing improved scraper:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Run the test
testImprovedScraper()
  .then(result => {
    logger.info('Test completed', { success: result.success });
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    logger.error('Unexpected error:', error);
    process.exit(1);
  });
