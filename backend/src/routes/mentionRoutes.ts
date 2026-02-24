import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import {
  analyzeMentions,
  getMentions,
  getMentionStats,
  resolveMention,
  setKeywords,
  getKeywords,
  getKeywordsDetailed,
  addKeyword,
  deleteKeyword,
  getFacebookPagesSessions,
  getUnreadAlerts,
  markAllAlertsAsRead,
  markAlertAsRead,
} from '../controllers/mentionController';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(protect);

// Analyse des mentions
router.post('/sessions/:sessionId/analyze', analyzeMentions);

// Récupérer les mentions
router.get('/', getMentions);

// Statistiques
router.get('/stats', getMentionStats);

// Résoudre une mention
router.post('/:mentionId/resolve', resolveMention);

// Gestion des mots-clés
router.get('/keywords', getKeywords);
router.get('/keywords/detailed', getKeywordsDetailed);
router.post('/keywords', setKeywords);
router.post('/keywords/add', addKeyword);
router.delete('/keywords/:keywordId', deleteKeyword);

// Sessions Facebook Pages pour la surveillance
router.get('/facebook-pages-sessions', getFacebookPagesSessions);

// Alertes
router.get('/alerts/unread', getUnreadAlerts);
router.post('/alerts/read-all', markAllAlertsAsRead);
router.post('/alerts/:alertId/read', markAlertAsRead);

export default router;
