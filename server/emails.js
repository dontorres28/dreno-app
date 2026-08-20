import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'Dreno <noreply@dreno.app>';

export async function sendBookingRequest({ coachEmail, coachName, athleteName, startsAt }) {
  try {
    await resend.emails.send({
      from: FROM,
      to: coachEmail,
      subject: 'New session request',
      html: `<p>Hi ${coachName},</p><p>${athleteName} has requested a session on ${new Date(startsAt).toLocaleString()}.</p><p>Log in to Dreno to confirm.</p>`,
    });
  } catch (err) {
    console.error('sendBookingRequest error:', err.message);
  }
}

export async function sendBookingConfirmed({ athleteEmail, athleteName, coachName, startsAt }) {
  try {
    await resend.emails.send({
      from: FROM,
      to: athleteEmail,
      subject: 'Session confirmed',
      html: `<p>Hi ${athleteName},</p><p>Your session with ${coachName} on ${new Date(startsAt).toLocaleString()} is confirmed. Your room link will be ready before the session starts.</p>`,
    });
  } catch (err) {
    console.error('sendBookingConfirmed error:', err.message);
  }
}

export async function sendBookingCancelled({ email, name, startsAt }) {
  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'Session cancelled',
      html: `<p>Hi ${name},</p><p>The session on ${new Date(startsAt).toLocaleString()} has been cancelled. If you paid, a refund will appear in 5 to 10 business days.</p>`,
    });
  } catch (err) {
    console.error('sendBookingCancelled error:', err.message);
  }
}

export async function sendNewMessage({ recipientEmail, recipientName, senderName }) {
  try {
    await resend.emails.send({
      from: FROM,
      to: recipientEmail,
      subject: `New message from ${senderName}`,
      html: `<p>Hi ${recipientName},</p><p>${senderName} sent you a message on Dreno. Log in to reply.</p>`,
    });
  } catch (err) {
    console.error('sendNewMessage error:', err.message);
  }
}
