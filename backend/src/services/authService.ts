import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, UserRegistration, UserLogin } from '../models/User';
import db from '../database';
import { config } from '../config/config';

export class AuthService {
  
    async register(userData: UserRegistration): Promise<{ user: User; token: string }> {
    const { email, password, name } = userData;

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
        verification_token: verificationToken,
        verification_token_expires_at: verificationTokenExpiresAt,
        email_verified_at: null, // Important
        role: 'user', // Rôle par défaut
        credits: 0, // Crédits par défaut
        subscription_status: 'free' // Statut par défaut
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
    const { email, password } = credentials;

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

    // Optionnel : Mettre à jour la date de dernière connexion
    // await db('users').where({ id: user.id }).update({ last_login: new Date() });

    // 3. Générer et retourner le token JWT
    const token = this.generateJWT(user);

    // Exclure le hash du mot de passe de la réponse
    const { password_hash, ...userToReturn } = user;

    return { user: userToReturn as User, token };
  }

  async sendVerificationEmail(user: User, token: string): Promise<void> {
    const verificationUrl = `${config.server.frontendUrl}/verify-email?token=${token}`;

    // TODO: Implémenter un vrai service d'envoi d'email (ex: Nodemailer, SendGrid)
    // Pour l'instant, on log le lien dans la console pour le développement
    console.log(`==== EMAIL DE VÉRIFICATION ====`)
    console.log(`Cher ${user.name || 'utilisateur'},
`);
    console.log(`Cliquez sur ce lien pour vérifier votre email: ${verificationUrl}
`);
    console.log(`Ce lien expire dans 1 heure.`);
    console.log(`===============================`);

    // Simule une opération asynchrone
    return Promise.resolve();
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

  async requestPasswordReset(email: string): Promise<boolean> {
    // 1. Trouver l'utilisateur par email
    const user = await db<User>('users').where({ email }).first();

    // Pour des raisons de sécurité, on ne révèle pas si l'email existe ou non.
    // On simule un succès même si l'utilisateur n'est pas trouvé ou non vérifié.
    if (user && user.email_verified_at) {
      // 2. Générer un token de réinitialisation
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiresAt = new Date(Date.now() + 3600000); // 1 heure

      // 3. Stocker le token et sa date d'expiration
      await db('users')
        .where({ id: user.id })
        .update({
          reset_token: resetToken,
          reset_token_expires_at: resetTokenExpiresAt,
        });

      // 4. Envoyer l'email de réinitialisation (simulation)
      const resetUrl = `${config.server.frontendUrl}/reset-password?token=${resetToken}`;
      console.log(`==== EMAIL DE RÉINITIALISATION DE MOT DE PASSE ====`)
      console.log(`Cliquez sur ce lien pour réinitialiser votre mot de passe: ${resetUrl}`);
      console.log(`==================================================`);
    }

    // Toujours retourner true pour ne pas permettre l'énumération d'utilisateurs
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

    // 4. Mettre à jour le mot de passe et invalider le token
    await db('users')
      .where({ id: user.id })
      .update({
        password_hash: hashedPassword,
        reset_token: null,
        reset_token_expires_at: null,
        // On pourrait aussi forcer une nouvelle connexion en invalidant les sessions/tokens JWT existants ici
      });

    return true;
  }

  generateJWT(user: User): string {
        if (!config.api.jwtSecret) {
      throw new Error('JWT_SECRET is not defined in the environment variables.');
    }

    return jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.api.jwtSecret,
      { expiresIn: '7d' }
    );
  }
}
