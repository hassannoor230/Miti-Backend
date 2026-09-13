/**
 * Transactional email service.
 *
 * Reads SMTP_* from .env. When SMTP_HOST is not set, email sending is a no-op
 * (the booking / enquiry is still stored — the site just doesn't notify by email).
 *
 * Supports Gmail, Outlook/Office365, SendGrid, Mailgun, or any standard SMTP server.
 */
const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST) return null;
  const port = Number(SMTP_PORT) || 587;
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    tls: secure ? undefined : { rejectUnauthorized: false },
  });
  return transporter;
}

async function sendMail({ to, subject, html, text, bcc }) {
  const t = getTransporter();
  if (!t) {
    console.log('[email] SMTP not configured — skipping mail to', to);
    return false;
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'Miti Beauty <noreply@mitibeauty.co.uk>';
  await t.sendMail({ from, to, subject, html, text, bcc });
  console.log('[email] Sent to', to, '—', subject);
  return true;
}

module.exports = { sendMail, getTransporter };