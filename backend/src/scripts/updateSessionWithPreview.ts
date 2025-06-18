import { sessionService } from '../services/sessionService';
import { apifyService } from '../services/apifyService';
import { logger } from '../utils/logger';

// ID de la session à mettre à jour
const sessionId = 'sess_Q8q2wnEnf_';
// ID du dataset Apify
const datasetId = 'ttRRtMbZgZ9WD0ZXG';

async function updateSessionWithPreview() {
  try {
    console.log(`Récupération des éléments de prévisualisation du dataset: ${datasetId}`);
    
    // Récupérer les éléments de prévisualisation
    const previewItems = await apifyService.getPreviewItems(datasetId, 5);
    console.log(`${previewItems.length} éléments de prévisualisation récupérés`);
    
    // Récupérer la session actuelle
    const session = sessionService.getSession(sessionId);
    if (!session) {
      console.error(`Session non trouvée: ${sessionId}`);
      return;
    }
    
    // Préparer les données de la session
    const sessionData = session.data || {};
    
    // Mettre à jour la session avec les éléments de prévisualisation
    const updatedSession = sessionService.updateSession(sessionId, {
      data: {
        ...sessionData,
        previewItems,
        nbItems: previewItems.length,
        totalItems: 135 // Nous savons qu'il y a 135 éléments au total
      }
    });
    
    console.log('Session mise à jour avec les éléments de prévisualisation:', JSON.stringify(updatedSession, null, 2));
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la session:', error);
  } finally {
    process.exit(0);
  }
}

// Exécuter la mise à jour
updateSessionWithPreview();
