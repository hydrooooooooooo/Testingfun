import axios from 'axios';
import { mailer } from './mailerService';

const env = (key: string) => (process.env[key] || '').trim();

const ALERTS_ENABLED = env('ALERTS_ENABLED').toLowerCase() === 'true';
const SLACK_WEBHOOK_URL = env('SLACK_WEBHOOK_URL');
const ALERT_EMAIL_TO = env('ALERT_EMAIL_TO');
const ALERT_EVENTS = (env('ALERT_EVENTS') || 'stripe.webhook_verification_failed,security.rate_limited,export.denied_not_owner')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const isEventSelected = (event: string) => ALERT_EVENTS.includes(event);

const sendSlack = async (title: string, body: Record<string, unknown>) => {
  if (!SLACK_WEBHOOK_URL) return;
  try {
    await axios.post(SLACK_WEBHOOK_URL, {
      text: `:rotating_light: ${title}`,
      attachments: [
        {
          color: '#d32f2f',
          fields: Object.entries(body).map(([k, v]) => ({ title: k, value: typeof v === 'string' ? v : JSON.stringify(v), short: false })),
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    });
  } catch {
    // avoid throwing in alert path
  }
};

const sendEmail = async (title: string, body: Record<string, unknown>) => {
  if (!ALERT_EMAIL_TO) return;
  try {
    await mailer.sendEmail({
      to: ALERT_EMAIL_TO,
      subject: `[ALERT] ${title}`,
      text: JSON.stringify(body, null, 2),
      html: `<pre>${escapeHtml(JSON.stringify(body, null, 2))}</pre>`,
    });
  } catch {
    // avoid throwing in alert path
  }
};

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

class AlertService {
  enabled = ALERTS_ENABLED;
  events = ALERT_EVENTS;

  shouldAlert(event: string) {
    return this.enabled && isEventSelected(event);
  }

  async notify(event: string, payload: Record<string, unknown>) {
    if (!this.shouldAlert(event)) return;
    const title = `${event}`;
    const body = { env: process.env.NODE_ENV || 'development', ts: new Date().toISOString(), ...payload };
    await Promise.all([
      sendSlack(title, body),
      sendEmail(title, body),
    ]);
  }
}

export const alertService = new AlertService();
