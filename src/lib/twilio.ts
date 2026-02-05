// src/lib/twilio.ts

import twilio from 'twilio';

// Validate required environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client (optional - only if credentials are provided)
export const twilioClient = accountSid && authToken 
  ? twilio(accountSid, authToken)
  : null;

// Export phone number for use in notification service
export const TWILIO_PHONE_NUMBER = phoneNumber || '';

// Check if Twilio is configured
export const isTwilioConfigured = !!(accountSid && authToken && phoneNumber);