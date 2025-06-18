import { apifyService } from '../../services/apifyService';
import { logger } from '../../utils/logger';
import fs from 'fs';
import path from 'path';

/**
 * Script to test the improved data extraction from an existing dataset
 * This will use our improved data mapping logic to extract better quality data
 */
async function testImprovedExtraction() {
  try {
    // Use the existing dataset ID from the session
    const datasetId = "ttRRtMbZgZ9WD0ZXG";
    const limit = 10; // Number of items to retrieve
    
    logger.info('Testing improved data extraction', { datasetId, limit });
    
    // Get preview items with our improved extraction logic
    const previewItems = await apifyService.getPreviewItems(datasetId, limit);
    logger.info(`Retrieved ${previewItems.length} preview items`);
    
    // Save results to a file for inspection
    const resultsPath = path.join(__dirname, '../../data/improved_extraction_results2.json');
    fs.writeFileSync(resultsPath, JSON.stringify(previewItems, null, 2));
    
    logger.info(`Results saved to ${resultsPath}`);
    
    // Log some sample data to verify quality
    if (previewItems.length > 0) {
      for (let i = 0; i < Math.min(3, previewItems.length); i++) {
        const item = previewItems[i];
        const descStr = typeof item.desc === 'string' ? item.desc : String(item.desc || '');
        const imageStr = typeof item.image === 'string' ? item.image : String(item.image || '');
        
        logger.info(`Item ${i + 1}:`, { 
          title: item.title,
          price: item.price,
          desc: descStr.substring(0, 50) + (descStr.length > 50 ? '...' : ''),
          location: item.location,
          url: item.url,
          image: imageStr.substring(0, 50) + (imageStr.length > 50 ? '...' : '')
        });
      }
    }
    
    // Update the session with improved preview items
    updateSessionWithImprovedItems(previewItems);
    
    return { success: true, previewCount: previewItems.length };
  } catch (error) {
    logger.error('Error testing improved extraction:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Update the existing session with improved preview items
 */
function updateSessionWithImprovedItems(previewItems: any[]) {
  try {
    const sessionsPath = path.join(__dirname, '../../data/sessions.json');
    const sessions = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'));
    
    if (sessions.length > 0) {
      // Update the first session with improved preview items
      sessions[0].data.previewItems = previewItems;
      sessions[0].updatedAt = new Date().toISOString();
      
      // Save updated sessions
      fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2));
      logger.info('Session updated with improved preview items');
    } else {
      logger.warn('No sessions found to update');
    }
  } catch (error) {
    logger.error('Error updating session with improved items:', error);
  }
}

// Run the test
testImprovedExtraction()
  .then(result => {
    logger.info('Test completed', { success: result.success });
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    logger.error('Unexpected error:', error);
    process.exit(1);
  });
