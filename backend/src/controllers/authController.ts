import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { UserRegistration, UserLogin } from '../models/User';

const authService = new AuthService();

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const userData: UserRegistration = req.body;
    // Validation basique (peut être remplacée par Joi/Zod)
    if (!userData.email || !userData.password || !userData.phone_number) {
        res.status(400).json({ message: 'Email, password and phone_number are required.' });
        return;
    }
    const phone = String(userData.phone_number).trim();
    const phoneRegex = /^\+?\d{7,15}$/;
    if (!phoneRegex.test(phone)) {
        res.status(400).json({ message: 'Invalid phone_number format. Use international format, e.g. +261340000000' });
        return;
    }

    // Vérifier la confirmation du mot de passe si fournie
    const confirmPassword = (req.body as any).confirm_password;
    if (typeof confirmPassword !== 'string' || confirmPassword.length === 0) {
        res.status(400).json({ message: 'confirm_password is required.' });
        return;
    }
    if (userData.password !== confirmPassword) {
        res.status(400).json({ message: 'Passwords do not match.' });
        return;
    }

    const { user, token } = await authService.register(userData);
    res.status(201).json({ message: 'User registered successfully. Please check your email for verification.', user, token });
  } catch (error) {
    const err = error as Error;
    // Gérer les conflits (email déjà existant)
    if (err.message.includes('already exists')) {
        res.status(409).json({ message: err.message });
    } else {
        res.status(500).json({ message: 'An internal error occurred.', error: err.message });
    }
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const credentials: UserLogin = req.body;
    if (!credentials.email || !credentials.password) {
        res.status(400).json({ message: 'Email and password are required.' });
        return;
    }

    const { user, token } = await authService.login(credentials);
    res.status(200).json({ user, token });
  } catch (error) {
     const err = error as Error;
    // Gérer les identifiants invalides
    if (err.message.includes('Invalid credentials')) {
        res.status(401).json({ message: err.message });
    } else {
        res.status(500).json({ message: 'An internal error occurred.', error: err.message });
    }
  }
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    await authService.verifyEmail(token);
    // Idéalement, rediriger vers une page de succès sur le frontend
    res.status(200).json({ message: 'Email verified successfully.' });
  } catch (error) {
    const err = error as Error;
    res.status(400).json({ message: 'Invalid or expired verification token.', error: err.message });
  }
};

export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
        res.status(400).json({ message: 'Email is required.' });
        return;
    }
    await authService.requestPasswordReset(email);
    // Toujours renvoyer un message de succès pour éviter l'énumération d'utilisateurs
    res.status(200).json({ message: 'If an account with this email exists, a password reset link has been sent.' });
  } catch (error) {
    const err = error as Error;
    // Ne pas exposer l'erreur au client, mais la logger côté serveur
    console.error('Password reset request error:', err);
    res.status(200).json({ message: 'If an account with this email exists, a password reset link has been sent.' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
        res.status(400).json({ message: 'Token and new password are required.' });
        return;
    }
    await authService.resetPassword(token, password);
    res.status(200).json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    const err = error as Error;
    res.status(400).json({ message: 'Invalid or expired reset token.', error: err.message });
  }
};

