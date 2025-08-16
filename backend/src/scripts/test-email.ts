import { mailer } from '../services/mailerService';
import { config } from '../config/config';

async function main() {
  const to = process.env.TEST_EMAIL_TO || (config.mail.user || 'contact@easyscrapy.com');
  console.log('Sending test email to:', to);
  await mailer.sendEmail({
    to,
    subject: 'Test Email - EasyScrapy (Nodemailer)',
    text: 'Ceci est un email de test envoyé par EasyScrapy via Nodemailer.',
    html: '<p>Ceci est un <strong>email de test</strong> envoyé par EasyScrapy via Nodemailer.</p>',
  });
  console.log('Done. If no error above, transporter accepted the message.');
}

main().catch((err) => {
  console.error('Test email error:', err);
  process.exit(1);
});
