// src/services/notificationService.ts

import { twilioClient, TWILIO_PHONE_NUMBER, isTwilioConfigured } from '@/lib/twilio';
import sgMail, { FROM_EMAIL, isSendGridConfigured } from '@/lib/sendgrid';
import {
  OrderWithRelations,
  BookingWithRelations,
} from '@/types';

// ============= SMS FUNCTIONS =============

/**
 * Send SMS using Twilio
 * @param to - Recipient phone number (E.164 format recommended)
 * @param message - SMS message content
 * @returns Promise with send result
 */
export async function sendSMS(
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Check if Twilio is configured
    if (!isTwilioConfigured || !twilioClient) {
      return {
        success: false,
        error: 'Twilio is not configured. Please add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to your environment variables.',
      };
    }

    // Validate phone number format (basic check)
    if (!to || to.trim().length === 0) {
      throw new Error('Recipient phone number is required');
    }

    // Send SMS via Twilio
    const result = await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: to,
    });

    console.log(`SMS sent successfully to ${to}, SID: ${result.sid}`);

    return {
      success: true,
      messageId: result.sid,
    };
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS',
    };
  }
}

// ============= EMAIL FUNCTIONS =============

/**
 * Send email using SendGrid
 * @param to - Recipient email address
 * @param subject - Email subject line
 * @param html - HTML email content
 * @param text - Plain text email content (optional, fallback)
 * @returns Promise with send result
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Check if SendGrid is configured
    if (!isSendGridConfigured) {
      return {
        success: false,
        error: 'SendGrid is not configured. Please add SENDGRID_API_KEY and SENDGRID_FROM_EMAIL to your environment variables.',
      };
    }

    // Validate email address (basic check)
    if (!to || !to.includes('@')) {
      throw new Error('Valid recipient email address is required');
    }

    if (!subject || subject.trim().length === 0) {
      throw new Error('Email subject is required');
    }

    if (!html || html.trim().length === 0) {
      throw new Error('Email content is required');
    }

    // Send email via SendGrid
    const msg = {
      to,
      from: FROM_EMAIL,
      subject,
      html,
      text: text || stripHtml(html), // Fallback to stripped HTML if no text provided
    };

    const result = await sgMail.send(msg);

    console.log(`Email sent successfully to ${to}`);

    return {
      success: true,
      messageId: result[0].headers['x-message-id'],
    };
  } catch (error) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

// ============= ORDER NOTIFICATIONS =============

/**
 * Send order confirmation notification (SMS + Email)
 * @param order - Order with relations
 * @returns Promise with send results
 */
export async function sendOrderConfirmation(
  order: OrderWithRelations
): Promise<{ sms: boolean; email: boolean }> {
  const customerName = order.customer.name;
  const orderNumber = order.orderNumber;
  const totalAmount = order.totalAmount;
  const orderType = order.type;

  // SMS message
  const smsMessage = `Hi ${customerName}! Your order ${orderNumber} (${orderType}) has been confirmed. Total: $${totalAmount.toFixed(2)}. We'll notify you when it's ready!`;

  // Email HTML
  const emailSubject = `Order Confirmation - ${orderNumber}`;
  const emailHtml = generateOrderConfirmationEmail(order);

  // Send both notifications
  const [smsResult, emailResult] = await Promise.all([
    order.customer.phone ? sendSMS(order.customer.phone, smsMessage) : Promise.resolve({ success: false }),
    sendEmail(order.customer.email, emailSubject, emailHtml),
  ]);

  return {
    sms: smsResult.success,
    email: emailResult.success,
  };
}

/**
 * Send order status update notification
 * @param order - Order with relations
 * @param newStatus - New order status
 * @returns Promise with send results
 */
export async function sendOrderStatusUpdate(
  order: OrderWithRelations,
  newStatus?: string
): Promise<{ sms: boolean; email: boolean }> {
  const status = newStatus || order.status;
  const customerName = order.customer.name;
  const orderNumber = order.orderNumber;

  // Generate status-specific messages
  const statusMessages = getOrderStatusMessages(status, orderNumber);

  // SMS message
  const smsMessage = `Hi ${customerName}! ${statusMessages.sms}`;

  // Email
  const emailSubject = `Order Update - ${orderNumber}`;
  const emailHtml = generateOrderStatusUpdateEmail(order, status, statusMessages.email);

  // Send both notifications
  const [smsResult, emailResult] = await Promise.all([
    order.customer.phone ? sendSMS(order.customer.phone, smsMessage) : Promise.resolve({ success: false }),
    sendEmail(order.customer.email, emailSubject, emailHtml),
  ]);

  return {
    sms: smsResult.success,
    email: emailResult.success,
  };
}

// ============= BOOKING NOTIFICATIONS =============

/**
 * Send booking confirmation notification (SMS + Email)
 * @param booking - Booking with relations
 * @returns Promise with send results
 */
export async function sendBookingConfirmation(
  booking: BookingWithRelations
): Promise<{ sms: boolean; email: boolean }> {
  const customerName = booking.customer.name;
  const bookingNumber = booking.bookingNumber;
  const date = new Date(booking.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const time = booking.time;
  const guests = booking.guests;

  // SMS message
  const smsMessage = `Hi ${customerName}! Your table reservation ${bookingNumber} is confirmed for ${date} at ${time} for ${guests} guest${guests > 1 ? 's' : ''}. See you soon!`;

  // Email HTML
  const emailSubject = `Reservation Confirmed - ${bookingNumber}`;
  const emailHtml = generateBookingConfirmationEmail(booking);

  // Send both notifications
  const [smsResult, emailResult] = await Promise.all([
    booking.customer.phone ? sendSMS(booking.customer.phone, smsMessage) : Promise.resolve({ success: false }),
    sendEmail(booking.customer.email, emailSubject, emailHtml),
  ]);

  return {
    sms: smsResult.success,
    email: emailResult.success,
  };
}

/**
 * Send booking reminder notification
 * @param booking - Booking with relations
 * @param hoursBeforeBooking - Hours before booking (24 or 2)
 * @returns Promise with send results
 */
export async function sendBookingReminder(
  booking: BookingWithRelations,
  hoursBeforeBooking: number
): Promise<{ sms: boolean; email: boolean }> {
  const customerName = booking.customer.name;
  const date = new Date(booking.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const time = booking.time;
  const guests = booking.guests;

  // SMS message
  const smsMessage = `Hi ${customerName}! Reminder: Your table for ${guests} is reserved ${hoursBeforeBooking === 24 ? 'tomorrow' : 'in 2 hours'} on ${date} at ${time}. Reply CANCEL to cancel.`;

  // Email
  const emailSubject = `Reservation Reminder - ${date} at ${time}`;
  const emailHtml = generateBookingReminderEmail(booking, hoursBeforeBooking);

  // Send both notifications
  const [smsResult, emailResult] = await Promise.all([
    booking.customer.phone ? sendSMS(booking.customer.phone, smsMessage) : Promise.resolve({ success: false }),
    sendEmail(booking.customer.email, emailSubject, emailHtml),
  ]);

  return {
    sms: smsResult.success,
    email: emailResult.success,
  };
}

// ============= EMAIL TEMPLATE GENERATORS =============

/**
 * Generate order confirmation email HTML
 */
function generateOrderConfirmationEmail(order: OrderWithRelations): string {
  const items = order.orderItems
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e5e5;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e5e5; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e5e5; text-align: right;">$${item.price.toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: #0ea5e9; margin: 0;">Order Confirmed!</h1>
  </div>
  
  <p>Hi ${order.customer.name},</p>
  <p>Thank you for your order! We've received it and are preparing your delicious food.</p>
  
  <div style="background-color: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <h2 style="margin-top: 0; color: #0ea5e9;">Order Details</h2>
    <p><strong>Order Number:</strong> ${order.orderNumber}</p>
    <p><strong>Order Type:</strong> ${order.type}</p>
    ${order.type === 'DINE_IN' && order.tableNumber ? `<p><strong>Table:</strong> ${order.tableNumber}</p>` : ''}
    ${order.type === 'PICKUP' && order.pickupTime ? `<p><strong>Pickup Time:</strong> ${new Date(order.pickupTime).toLocaleString()}</p>` : ''}
    ${order.type === 'DELIVERY' && order.estimatedDeliveryTime ? `<p><strong>Estimated Delivery:</strong> ${new Date(order.estimatedDeliveryTime).toLocaleString()}</p>` : ''}
    
    <h3 style="margin-top: 20px;">Items</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background-color: #f8f9fa;">
          <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e5e5;">Item</th>
          <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e5e5e5;">Qty</th>
          <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e5e5e5;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${items}
      </tbody>
    </table>
    
    <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e5e5e5;">
      <p style="display: flex; justify-content: space-between; margin: 5px 0;">
        <span>Subtotal:</span>
        <span>$${order.subtotal.toFixed(2)}</span>
      </p>
      <p style="display: flex; justify-content: space-between; margin: 5px 0;">
        <span>Tax:</span>
        <span>$${order.taxAmount.toFixed(2)}</span>
      </p>
      ${order.deliveryFee > 0 ? `<p style="display: flex; justify-content: space-between; margin: 5px 0;"><span>Delivery Fee:</span><span>$${order.deliveryFee.toFixed(2)}</span></p>` : ''}
      ${order.tipAmount > 0 ? `<p style="display: flex; justify-content: space-between; margin: 5px 0;"><span>Tip:</span><span>$${order.tipAmount.toFixed(2)}</span></p>` : ''}
      <p style="display: flex; justify-content: space-between; margin: 10px 0 0 0; font-size: 18px; font-weight: bold;">
        <span>Total:</span>
        <span>$${order.totalAmount.toFixed(2)}</span>
      </p>
    </div>
  </div>
  
  <p>We'll send you another notification when your order is ready!</p>
  
  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: center;">
    <p style="margin: 0; font-size: 14px; color: #666;">Questions? Contact us at ${FROM_EMAIL}</p>
  </div>
</body>
</html>
  `;
}

/**
 * Generate order status update email HTML
 */
function generateOrderStatusUpdateEmail(
  order: OrderWithRelations,
  status: string,
  message: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Update</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: #0ea5e9; margin: 0;">Order Update</h1>
  </div>
  
  <p>Hi ${order.customer.name},</p>
  <p>${message}</p>
  
  <div style="background-color: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <p><strong>Order Number:</strong> ${order.orderNumber}</p>
    <p><strong>Status:</strong> <span style="color: #0ea5e9; font-weight: bold;">${formatOrderStatus(status)}</span></p>
  </div>
  
  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: center;">
    <p style="margin: 0; font-size: 14px; color: #666;">Questions? Contact us at ${FROM_EMAIL}</p>
  </div>
</body>
</html>
  `;
}

/**
 * Generate booking confirmation email HTML
 */
function generateBookingConfirmationEmail(booking: BookingWithRelations): string {
  const date = new Date(booking.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reservation Confirmed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: #0ea5e9; margin: 0;">Reservation Confirmed!</h1>
  </div>
  
  <p>Hi ${booking.customer.name},</p>
  <p>Your table reservation has been confirmed. We look forward to serving you!</p>
  
  <div style="background-color: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <h2 style="margin-top: 0; color: #0ea5e9;">Reservation Details</h2>
    <p><strong>Confirmation Number:</strong> ${booking.bookingNumber}</p>
    <p><strong>Date:</strong> ${date}</p>
    <p><strong>Time:</strong> ${booking.time}</p>
    <p><strong>Party Size:</strong> ${booking.guests} guest${booking.guests > 1 ? 's' : ''}</p>
    ${booking.table ? `<p><strong>Table:</strong> ${booking.table.number}</p>` : ''}
    ${booking.specialRequests ? `<p><strong>Special Requests:</strong> ${booking.specialRequests}</p>` : ''}
  </div>
  
  <p>We'll send you a reminder before your reservation.</p>
  
  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: center;">
    <p style="margin: 0; font-size: 14px; color: #666;">Need to cancel or modify? Contact us at ${FROM_EMAIL}</p>
  </div>
</body>
</html>
  `;
}

/**
 * Generate booking reminder email HTML
 */
function generateBookingReminderEmail(
  booking: BookingWithRelations,
  hoursBeforeBooking: number
): string {
  const date = new Date(booking.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reservation Reminder</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: #0ea5e9; margin: 0;">Reservation Reminder</h1>
  </div>
  
  <p>Hi ${booking.customer.name},</p>
  <p>This is a friendly reminder about your upcoming reservation ${hoursBeforeBooking === 24 ? 'tomorrow' : 'in 2 hours'}!</p>
  
  <div style="background-color: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <h2 style="margin-top: 0; color: #0ea5e9;">Reservation Details</h2>
    <p><strong>Date:</strong> ${date}</p>
    <p><strong>Time:</strong> ${booking.time}</p>
    <p><strong>Party Size:</strong> ${booking.guests} guest${booking.guests > 1 ? 's' : ''}</p>
    <p><strong>Confirmation Number:</strong> ${booking.bookingNumber}</p>
  </div>
  
  <p>We look forward to seeing you!</p>
  
  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: center;">
    <p style="margin: 0; font-size: 14px; color: #666;">Need to cancel? Contact us at ${FROM_EMAIL}</p>
  </div>
</body>
</html>
  `;
}

// ============= CONTACT MESSAGE NOTIFICATION =============

/**
 * Send contact form submission notification to admin
 * @param contactData - Contact form data
 * @returns Promise with send result
 */
export async function sendContactFormNotification(
  contactData: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Send email to admin
    const adminEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Form Submission</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: #0ea5e9; margin: 0;">New Contact Form Submission</h1>
  </div>
  
  <div style="background-color: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <h2 style="margin-top: 0; color: #0ea5e9;">Contact Details</h2>
    <p><strong>Name:</strong> ${contactData.name}</p>
    <p><strong>Email:</strong> <a href="mailto:${contactData.email}">${contactData.email}</a></p>
    ${contactData.phone ? `<p><strong>Phone:</strong> <a href="tel:${contactData.phone}">${contactData.phone}</a></p>` : ''}
    <p><strong>Subject:</strong> ${contactData.subject}</p>
    
    <h3 style="margin-top: 20px;">Message</h3>
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px;">
      <p style="margin: 0; white-space: pre-wrap;">${contactData.message}</p>
    </div>
  </div>
  
  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: center;">
    <p style="margin: 0; font-size: 14px; color: #666;">Reply to this customer at ${contactData.email}</p>
  </div>
</body>
</html>
    `;

    // Send confirmation email to customer
    const customerEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Message Received</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: #0ea5e9; margin: 0;">Message Received!</h1>
  </div>
  
  <p>Hi ${contactData.name},</p>
  <p>Thank you for contacting us! We've received your message and will get back to you shortly.</p>
  
  <div style="background-color: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <h2 style="margin-top: 0; color: #0ea5e9;">Your Message</h2>
    <p><strong>Subject:</strong> ${contactData.subject}</p>
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 10px;">
      <p style="margin: 0; white-space: pre-wrap;">${contactData.message}</p>
    </div>
  </div>
  
  <p>We typically respond within 24 hours during business days.</p>
  
  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: center;">
    <p style="margin: 0; font-size: 14px; color: #666;">Questions? Reply to this email at ${FROM_EMAIL}</p>
  </div>
</body>
</html>
    `;

    // Send both emails
    const [adminResult, customerResult] = await Promise.all([
      sendEmail(FROM_EMAIL, `New Contact: ${contactData.subject}`, adminEmailHtml),
      sendEmail(contactData.email, 'We received your message!', customerEmailHtml),
    ]);

    if (!adminResult.success) {
      console.error('Failed to send admin notification:', adminResult.error);
    }

    if (!customerResult.success) {
      console.error('Failed to send customer confirmation:', customerResult.error);
    }

    // Return success if at least customer email was sent
    return {
      success: customerResult.success,
      error: customerResult.success ? undefined : customerResult.error,
    };
  } catch (error) {
    console.error('Contact form notification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send notification',
    };
  }
}

/**
 * Get status-specific messages for order updates
 */
function getOrderStatusMessages(status: string, orderNumber: string): { sms: string; email: string } {
  const messages: Record<string, { sms: string; email: string }> = {
    ACCEPTED: {
      sms: `Your order ${orderNumber} has been accepted and is being prepared.`,
      email: `Great news! Your order has been accepted by our kitchen and is now being prepared with care.`,
    },
    PREPARING: {
      sms: `Your order ${orderNumber} is being prepared by our chefs.`,
      email: `Our chefs are hard at work preparing your delicious meal!`,
    },
    READY: {
      sms: `Your order ${orderNumber} is ready! Come pick it up.`,
      email: `Your order is ready and waiting for you! Please come pick it up at your earliest convenience.`,
    },
    OUT_FOR_DELIVERY: {
      sms: `Your order ${orderNumber} is out for delivery and will arrive soon!`,
      email: `Your order is on its way! Our delivery driver will arrive soon with your food.`,
    },
    DELIVERED: {
      sms: `Your order ${orderNumber} has been delivered. Enjoy your meal!`,
      email: `Your order has been successfully delivered. We hope you enjoy your meal!`,
    },
    CANCELLED: {
      sms: `Your order ${orderNumber} has been cancelled. If this was a mistake, please contact us.`,
      email: `Your order has been cancelled. If you did not request this cancellation, please contact us immediately.`,
    },
  };

  return (
    messages[status] || {
      sms: `Your order ${orderNumber} status has been updated.`,
      email: `There has been an update to your order status.`,
    }
  );
}

/**
 * Format order status for display
 */
function formatOrderStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Strip HTML tags from string (basic implementation)
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}