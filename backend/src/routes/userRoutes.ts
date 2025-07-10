import { Router } from 'express';
import { getDashboardData, getPaymentHistory, getDownloadHistory, changePassword } from '../controllers/userController';
import { protect } from '../middlewares/authMiddleware'; // Assurez-vous que le chemin est correct

const router = Router();

// Toutes les routes ci-dessous sont protégées et nécessitent une authentification
router.use(protect);

// Route pour les données du tableau de bord
router.get('/dashboard', getDashboardData);

// Route pour l'historique des paiements
router.get('/payments', getPaymentHistory);

// Route pour l'historique des téléchargements
router.get('/downloads', getDownloadHistory);

export default router;
