import { User } from '../models/User';

export class UserService {
  
  async getUserProfile(userId: number): Promise<User | null> {
    // Récupérer profil utilisateur
    throw new Error('Method not implemented.');
  }

  async updateProfile(userId: number, updates: Partial<User>): Promise<User> {
    // Mettre à jour profil
    throw new Error('Method not implemented.');
  }

  async getUserStats(userId: number): Promise<{
    totalScrapes: number;
    totalDownloads: number;
    totalSpent: number;
    memberSince: Date;
    lastActivity: Date;
  }> {
    // Statistiques utilisateur pour dashboard
    throw new Error('Method not implemented.');
  }
}
