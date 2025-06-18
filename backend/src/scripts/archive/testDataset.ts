import { apifyService } from '../services/apifyService';
import { logger } from '../utils/logger';

// ID du dataset Apify à tester
const datasetId = 'ttRRtMbZgZ9WD0ZXG';

async function testDatasetRetrieval() {
  try {
    console.log(`Tentative de récupération des éléments du dataset: ${datasetId}`);
    
    // Récupérer les éléments de prévisualisation
    const previewItems = await apifyService.getPreviewItems(datasetId, 5);
    console.log('Éléments de prévisualisation récupérés:', JSON.stringify(previewItems, null, 2));
    
    // Si nous avons des éléments, récupérer tous les éléments
    if (previewItems.length > 0) {
      console.log('Récupération de tous les éléments du dataset...');
      const allItems = await apifyService.getAllItems(datasetId);
      console.log(`Nombre total d'éléments récupérés: ${allItems.length}`);
      console.log('Premier élément:', JSON.stringify(allItems[0], null, 2));
    } else {
      console.log('Aucun élément trouvé dans le dataset.');
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des données du dataset:', error);
  } finally {
    process.exit(0);
  }
}

// Exécuter le test
testDatasetRetrieval();
