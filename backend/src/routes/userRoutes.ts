import { Router } from 'express';
import { getDashboardData, getPaymentHistory, getDownloadHistory, changePassword, updateProfile } from '../controllers/userController';
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

// Route pour changer le mot de passe
router.post('/change-password', changePassword);

// Route pour mettre à jour le profil
router.put('/profile', updateProfile);

export default router;
