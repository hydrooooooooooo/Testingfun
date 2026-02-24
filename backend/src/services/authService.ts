import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, UserRegistration, UserLogin } from '../models/User';
import db from '../database';
import { config } from '../config/config';
import { mailer, renderVerificationEmail, renderPasswordResetEmail } from './mailerService';

export class AuthService {
  
    async register(userData: UserRegistration): Promise<{ user: User; token: string }> {
    const { password, name, phone_number, business_sector, company_size } = userData;
    const email = userData.email.trim().toLowerCase();

    // 1. Vérifier si l'email est unique
    const existingUser = await db<User>('users').where({ email }).first();
    if (existingUser) {
      throw new Error('An account with this email already exists.');
    }

    // 2. Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Générer le token de vérification
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiresAt = new Date(Date.now() + 3600000); // 1 heure

    // 5. Créer l'utilisateur en base de données avec le token
    const [newUser] = await db<User>('users')
      .insert({
        email,
        password_hash: hashedPassword,
        name,
        phone_number,
        business_sector: business_sector || undefined,
        company_size: company_size || undefined,
        verification_token: verificationToken,
        verification_token_expires_at: verificationTokenExpiresAt,
        email_verified_at: null, // Important
        role: 'user', // Rôle par défaut
        credits: 0, // Crédits par défaut
        subscription_status: 'free', // Statut par défaut
        last_verification_email_sent_at: new Date(),
      })
      .returning('*');

    // Envoyer l'email de vérification
    await this.sendVerificationEmail(newUser, verificationToken);


    // 6. Générer et retourner le token JWT
    const token = this.generateJWT(newUser);

    // Exclure le hash du mot de passe de la réponse
    const { password_hash, ...userToReturn } = newUser;

    return { user: userToReturn as User, token };
  }

  async login(credentials: UserLogin): Promise<{ user: User; token: string }> {
    const { password } = credentials;
    const email = credentials.email.trim().toLowerCase();

    // 1. Trouver l'utilisateur par email
    const user = await db<User>('users').where({ email }).first();
    if (!user) {
      throw new Error('Invalid credentials.'); // Message générique pour la sécurité
    }

    // 2. Vérifier le mot de passe
    if (!user.password_hash) {
        throw new Error('Invalid credentials.'); // L'utilisateur n'a pas de mot de passe défini
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid credentials.'); // Message générique pour la sécurité
    }

    // 3. Vérifier que l'email a été vérifié
    if (!user.email_verified_at) {
      throw new Error('Email not verified');
    }

    // Optionnel : Mettre à jour la date de dernière connexion
    // await db('users').where({ id: user.id }).update({ last_login: new Date() });

    // 4. Générer et retourner le token JWT
    const token = this.generateJWT(user);

    // Exclure le hash du mot de passe de la réponse
    const { password_hash, ...userToReturn } = user;

    return { user: userToReturn as User, token };
  }

  async sendVerificationEmail(user: User, token: string): Promise<void> {
    const verificationUrl = `${config.server.backendUrl}/api/auth/verify-email/${token}`;
    const email = renderVerificationEmail({ verifyUrl: verificationUrl, name: user.name || undefined });
    await mailer.sendEmail({
      to: user.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
  }

  async verifyEmail(token: string): Promise<boolean> {
    // 1. Trouver l'utilisateur avec ce token
    const user = await db<User>('users').where({ verification_token: token }).first();

    if (!user) {
      throw new Error('Invalid verification token.');
    }

    // 2. Vérifier si l'email est déjà vérifié
    if (user.email_verified_at) {
        // On peut considérer que c'est un succès, car le but est atteint.
        return true; 
    }

    // 3. Vérifier si le token a expiré
    if (!user.verification_token_expires_at || new Date() > new Date(user.verification_token_expires_at)) {
        // Ici, on pourrait proposer de renvoyer un nouveau lien
        throw new Error('Verification token has expired.');
    }

    // 4. Mettre à jour l'utilisateur
    await db('users')
      .where({ id: user.id })
      .update({
        email_verified_at: new Date(),
        verification_token: null, // Invalider le token après usage
        verification_token_expires_at: null,
      });

    return true;
  }

  async requestPasswordReset(rawEmail: string): Promise<boolean> {
    const email = rawEmail.trim().toLowerCase();
    // 1. Trouver l'utilisateur par email
    const user = await db<User>('users').where({ email }).first();

    // Pour des raisons de sécurité, on ne révèle pas si l'email existe ou non.
    // On renvoie toujours 200, mais on agit différemment côté serveur.
    if (!user) {
      // Utilisateur inexistant -> ne rien envoyer
      return true;
    }

    // 2. Si l'email est vérifié -> envoyer l'email de reset
    if (user.email_verified_at) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiresAt = new Date(Date.now() + 3600000); // 1 heure

      await db('users')
        .where({ id: user.id })
        .update({
          reset_token: resetToken,
          reset_token_expires_at: resetTokenExpiresAt,
        });

      const resetUrl = `${config.server.backendUrl}/api/auth/reset-password/${resetToken}`;
      const resetEmail = renderPasswordResetEmail({ resetUrl, name: user.name || undefined });
      await mailer.sendEmail({
        to: user.email,
        subject: resetEmail.subject,
        text: resetEmail.text,
        html: resetEmail.html,
      });
      return true;
    }

    // 3. Si l'email n'est pas vérifié -> renvoyer un email de vérification
    //    Appliquer un cooldown de 2 minutes entre les renvois
    const now = Date.now();
    const lastSent = user.last_verification_email_sent_at ? new Date(user.last_verification_email_sent_at).getTime() : 0;
    const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes
    if (lastSent && now - lastSent < COOLDOWN_MS) {
      // Cooldown actif: ne rien envoyer, mais répondre comme si c'était OK
      return true;
    }
    let verificationToken = user.verification_token as unknown as string | null;
    const tokenExpired = !user.verification_token_expires_at || new Date() > new Date(user.verification_token_expires_at);
    if (!verificationToken || tokenExpired) {
      verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpiresAt = new Date(Date.now() + 3600000); // 1 heure
      await db('users')
        .where({ id: user.id })
        .update({
          verification_token: verificationToken,
          verification_token_expires_at: verificationTokenExpiresAt,
        });
    }

    const verifyUrl = `${config.server.backendUrl}/api/auth/verify-email/${verificationToken}`;
    await this.sendVerificationEmail(user, verificationToken!);
    // Mettre à jour l'horodatage du dernier envoi
    await db('users').where({ id: user.id }).update({ last_verification_email_sent_at: new Date() });
    return true;
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    // 1. Trouver l'utilisateur avec ce token
    const user = await db<User>('users').where({ reset_token: token }).first();

    if (!user) {
      throw new Error('Invalid or expired password reset token.');
    }

    // 2. Vérifier si le token a expiré
    if (!user.reset_token_expires_at || new Date() > new Date(user.reset_token_expires_at)) {
      throw new Error('Invalid or expired password reset token.');
    }

    // 3. Hasher le nouveau mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 4. Mettre à jour le mot de passe, invalider le token, and force re-login
    await db('users')
      .where({ id: user.id })
      .update({
        password_hash: hashedPassword,
        reset_token: null,
        reset_token_expires_at: null,
        password_changed_at: new Date(),
      });

    return true;
  }

  generateJWT(user: User): string {
        if (!config.api.jwtSecret) {
      throw new Error('JWT_SECRET is not defined in the environment variables.');
    }

    return jwt.sign(
      { userId: user.id, name: user.name, email: user.email, role: user.role, phone_number: user.phone_number, business_sector: user.business_sector, company_size: user.company_size },
      config.api.jwtSecret,
      { expiresIn: '7d' }
    );
  }
}

