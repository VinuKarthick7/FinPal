import nodemailer from 'nodemailer';
import config from '../config';

type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

const getTransport = () => {
  if (!config.smtpHost) return null;

  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: config.smtpUser && config.smtpPass ? { user: config.smtpUser, pass: config.smtpPass } : undefined,
  });
};

export const sendEmail = async ({ to, subject, html, text }: SendEmailArgs) => {
  const transport = getTransport();

  // Dev-friendly fallback: if SMTP isn't configured, log the email to console.
  if (!transport) {
    // Keep it readable in logs.
    console.log('[Email disabled] To:', to);
    console.log('[Email disabled] Subject:', subject);
    console.log('[Email disabled] Body:', text || html);
    return;
  }

  await transport.sendMail({
    from: config.emailFrom,
    to,
    subject,
    html,
    text,
  });
};

export const buildVerifyEmailHtml = (verifyUrl: string) => {
  return `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.5;">
      <h2 style="margin: 0 0 12px;">Verify your email</h2>
      <p style="margin: 0 0 16px;">Thanks for signing up for FinPal. Please verify your email address to activate your account.</p>
      <p style="margin: 0 0 16px;">
        <a href="${verifyUrl}" style="display: inline-block; padding: 10px 14px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 10px;">Verify Email</a>
      </p>
      <p style="margin: 0; color: #6b7280; font-size: 12px;">If you didn’t request this, you can ignore this email.</p>
    </div>
  `;
};
