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
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:24px 0;font-family:Arial,Helvetica,sans-serif">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
              <tr>
                <td style="background:#111827;color:#ffffff;padding:16px 24px;font-size:18px;font-weight:600">
                  EasyScrapy
                </td>
              </tr>
              <tr>
                <td style="padding:24px;color:#1f2937">
                  <h2 style="margin:0 0 12px 0;font-size:20px;color:#111827">${title}</h2>
                  <p style="margin:0 0 12px 0">${greeting}</p>
                  <p style="margin:0 0 16px 0">Merci pour votre inscription sur <strong>EasyScrapy</strong>.</p>
                  <p style="margin:0 0 16px 0">Pour vérifier votre adresse email, cliquez sur le bouton ci-dessous:</p>
                  <p style="margin:16px 0">
                    <a href="${verifyUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none">Vérifier mon email</a>
                  </p>
                  <p style="margin:16px 0 0 0;color:#6b7280;font-size:12px">Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur:<br/>
                    <a href="${verifyUrl}" style="color:#4f46e5;text-decoration:underline">${verifyUrl}</a>
                  </p>
                  <p style="margin:16px 0 0 0;color:#6b7280;font-size:12px">Ce lien expire dans 1 heure.</p>
                </td>
              </tr>
              <tr>
                <td style="background:#f3f4f6;color:#6b7280;padding:12px 24px;font-size:12px;text-align:center">
                  ${new Date().getFullYear()} EasyScrapy. Tous droits réservés.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `,
  };
};

export const renderPasswordResetEmail = (params: { resetUrl: string; name?: string }) => {
  const { resetUrl, name } = params;
  const title = 'Réinitialisation de votre mot de passe';
  const greeting = name ? `Bonjour ${name},` : 'Bonjour,';
  return {
    subject: '[EasyScrapy] Réinitialisez votre mot de passe',
    text: `${greeting}\n\nVous avez demandé la réinitialisation de votre mot de passe EasyScrapy. Pour procéder, ouvrez ce lien: ${resetUrl}\n\nCe lien est valable 1 heure. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.\n\nBesoin d'aide ? Répondez simplement à ce message.`,
    html: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:24px 0;font-family:Arial,Helvetica,sans-serif">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
              <tr>
                <td style="background:#111827;color:#ffffff;padding:16px 24px;font-size:18px;font-weight:600">
                  EasyScrapy
                </td>
              </tr>
              <tr>
                <td style="padding:24px;color:#1f2937">
                  <h2 style="margin:0 0 12px 0;font-size:20px;color:#111827">${title}</h2>
                  <p style="margin:0 0 12px 0">${greeting}</p>
                  <p style="margin:0 0 12px 0">Vous avez récemment demandé à réinitialiser votre mot de passe.</p>
                  <p style="margin:0 0 16px 0">Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe:</p>
                  <p style="margin:16px 0">
                    <a href="${resetUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none">Réinitialiser mon mot de passe</a>
                  </p>
                  <p style="margin:16px 0 0 0;color:#6b7280;font-size:12px">Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur:<br/>
                    <a href="${resetUrl}" style="color:#4f46e5;text-decoration:underline">${resetUrl}</a>
                  </p>
                  <p style="margin:16px 0 0 0;color:#6b7280;font-size:12px">Ce lien est valable <strong>1 heure</strong>.</p>
                  <p style="margin:16px 0 0 0;color:#6b7280;font-size:12px">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail. Votre mot de passe restera inchangé.</p>
                </td>
              </tr>
              <tr>
                <td style="background:#f3f4f6;color:#6b7280;padding:12px 24px;font-size:12px;text-align:center">
                  ${new Date().getFullYear()} EasyScrapy. Tous droits réservés.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `,
  };
};
