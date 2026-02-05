// src/lib/sendgrid.ts

import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key from environment
const apiKey = process.env.SENDGRID_API_KEY;

if (apiKey) {
  sgMail.setApiKey(apiKey);
}

// From email address (configured in environment)
export const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@restaurant.com';

// Check if SendGrid is configured
export const isSendGridConfigured = !!(apiKey && FROM_EMAIL);

// Export configured SendGrid client
export default sgMail;