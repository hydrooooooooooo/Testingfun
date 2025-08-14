import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/config';
import { logger } from '../utils/logger';

class MailerService {
  private transporter: Transporter;
  private from: string;

  constructor() {
    const { host, port, secure, user, pass, tlsRejectUnauthorized } = config.mail;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure, // true for 465, false for other ports
      auth: user && pass ? { user, pass } : undefined,
      tls: { rejectUnauthorized: tlsRejectUnauthorized },
    });

    this.from = config.mail.fromEmail || user || 'no-reply@local';
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string;
    fromName?: string;
  }): Promise<void> {
    const { to, subject, html, text, replyTo, fromName } = options;

    const fromDisplay = fromName || config.mail.fromName || 'EasyScrapy';

    const mailOptions = {
      from: `${fromDisplay} <${this.from}>`,
      to,
      subject,
      text,
      html,
      replyTo: replyTo || config.mail.replyTo || undefined,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId}`);
    } catch (err) {
      logger.error('Error sending email', { error: (err as Error).message });
      if (!config.server.isDev) throw err;
    }
  }
}

export const mailer = new MailerService();

export const renderVerificationEmail = (params: { verifyUrl: string; name?: string }) => {
  const { verifyUrl, name } = params;
  const title = 'Verify your email';
  const greeting = name ? `Bonjour ${name},` : 'Bonjour,';
  return {
    subject: 'Vérification de votre email',
    text: `${greeting}\n\nMerci pour votre inscription sur EasyScrapy. Pour vérifier votre adresse email, cliquez sur le lien suivant: ${verifyUrl}\n\nCe lien expire dans 1 heure.`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#222">
        <h2>${title}</h2>
        <p>${greeting}</p>
        <p>Merci pour votre inscription sur <strong>EasyScrapy</strong>.</p>
        <p>Pour vérifier votre adresse email, cliquez sur le bouton ci-dessous:</p>
        <p>
          <a href="${verifyUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Vérifier mon email</a>
        </p>
        <p>Ou copiez-collez ce lien dans votre navigateur:<br/>
          <a href="${verifyUrl}">${verifyUrl}</a>
        </p>
        <p style="color:#666;font-size:12px">Ce lien expire dans 1 heure.</p>
      </div>
    `,
  };
};

export const renderPasswordResetEmail = (params: { resetUrl: string; name?: string }) => {
  const { resetUrl, name } = params;
  const title = 'Réinitialisation du mot de passe';
  const greeting = name ? `Bonjour ${name},` : 'Bonjour,';
  return {
    subject: 'Réinitialisation de votre mot de passe',
    text: `${greeting}\n\nPour réinitialiser votre mot de passe EasyScrapy, cliquez sur le lien suivant: ${resetUrl}\n\nCe lien expire dans 1 heure.`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#222">
        <h2>${title}</h2>
        <p>${greeting}</p>
        <p>Pour réinitialiser votre mot de passe, cliquez sur le bouton ci-dessous:</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Réinitialiser le mot de passe</a>
        </p>
        <p>Ou copiez-collez ce lien dans votre navigateur:<br/>
          <a href="${resetUrl}">${resetUrl}</a>
        </p>
        <p style="color:#666;font-size:12px">Ce lien expire dans 1 heure.</p>
      </div>
    `,
  };
};
