import { sessionService, SessionStatus } from '../services/sessionService';
import { logger } from '../utils/logger';

// ID de la session à mettre à jour
const sessionId = 'sess_Q8q2wnEnf_';
// ID du dataset Apify
const datasetId = 'ttRRtMbZgZ9WD0ZXG';
// ID de l'exécution de l'acteur Apify (facultatif)
const actorRunId = 'abc123'; // Remplacez par l'ID réel si disponible

(async () => {
  try {
    // Mettre à jour la session
    const updatedSession = await sessionService.updateSession(sessionId, {
      datasetId,
      actorRunId,
      status: SessionStatus.FINISHED,
    });

    if (updatedSession) {
      logger.info(`Session mise à jour avec succès: ${JSON.stringify(updatedSession)}`);
      console.log('Session mise à jour avec succès:', updatedSession);
    } else {
      logger.error(`Échec de la mise à jour de la session: ${sessionId}`);
      console.error('Échec de la mise à jour de la session:', sessionId);
    }
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour de la session ${sessionId}:`, error);
    console.error(`Erreur lors de la mise à jour de la session ${sessionId}:`, error);
  } finally {
    // Sortir du script
    process.exit(0);
  }
})();
