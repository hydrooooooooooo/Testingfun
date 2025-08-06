import { sessionService } from '../services/sessionService';
import { logger } from '../utils/logger';

const updateSessionWithPreview = async () => {
  const sessionId = process.argv[2];
  if (!sessionId) {
    logger.error('Erreur: Veuillez fournir un ID de session en argument.');
    logger.info('Usage: npm run script:update-preview <sessionId>');
    process.exit(1);
  }

  try {
    const session = await sessionService.getSession(sessionId);
    if (!session) {
      logger.error(`Session avec l'ID ${sessionId} non trouvée.`);
      return;
    }

    // Simuler des données de prévisualisation
    const previewItems = [
      { title: 'Aperçu 1', price: '10€' },
      { title: 'Aperçu 2', price: '20€' },
    ];

    await sessionService.updateSession(sessionId, {
      previewItems: previewItems,
      hasData: true,
      totalItems: session.totalItems || previewItems.length, // Conserve l'ancien total ou met à jour
    });

    logger.info(`La session ${sessionId} a été mise à jour avec succès avec les données de prévisualisation.`);

  } catch (error) {
    logger.error(`Échec de la mise à jour de la session ${sessionId}:`, error);
  }
};

updateSessionWithPreview();
