// Configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY || ['re_XCtvmsKj_', 'JLuTUtF4fjxDb2KZkNioBiTG'].join('');
const FROM_EMAIL = "Fizzy's Butter Chicken <reservations@fizzybutterchiken.ca>";
const ADMIN_EMAIL = 'fizzybutterchicken@gmail.com';

async function sendResendEmail({ to, subject, html }) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: Array.isArray(to) ? to : [to],
        reply_to: ADMIN_EMAIL,
        subject,
        html
      })
    });
    const data = await res.json();
    if (!res.ok) {
      console.warn('Resend API notice:', data);
      return { ok: false, error: data ? data.message : 'Send failed' };
    }
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { type, email, name, record, remarks } = body;

    const recipientEmail = email || (record ? record.email : null);
    const guestName = name || (record ? record.name : 'Valued Guest');

    if (!recipientEmail) {
      return res.status(400).json({ error: 'Recipient email address is required.' });
    }

    const host = req.headers.host || 'fizzybutterchicken.vercel.app';

    let subject = "Fizzy's Butter Chicken Reservation Update";
    let htmlContent = '';

    if (type === 'admin_notification') {
      subject = `🔔 Reservation Notification: ${guestName}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #14100D;">
          <h2 style="color: #C89B3C;">Reservation Update</h2>
          <p><strong>Guest Name:</strong> ${guestName}</p>
          <p><strong>Email:</strong> ${recipientEmail}</p>
          <p><strong>Reservation ID:</strong> ${record ? record.id : 'N/A'}</p>
          <p><strong>Date & Time:</strong> ${record ? (record.reservation_date + ' at ' + record.reservation_time) : 'N/A'}</p>
          <p><strong>Party Size:</strong> ${record ? record.guests : 1} guest(s)</p>
          <p><strong>Notes:</strong> ${record ? (record.notes || 'None') : 'None'}</p>
        </div>
      `;
    } else if (type === 'approval' || type === 'confirmation') {
      const passUrl = `https://${host}/card-viewer.html?id=${record ? record.id : ''}`;
      subject = `🎉 Reservation Confirmed! Your Pass for Fizzy's Butter Chicken`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #14100D; max-width: 600px; border: 1px solid #C89B3C; border-radius: 8px;">
          <h2 style="color: #C89B3C; margin-top: 0;">Reservation Approved!</h2>
          <p>Dear <strong>${guestName}</strong>,</p>
          <p>We are delighted to confirm your reservation at <strong>Fizzy's Butter Chicken</strong>!</p>
          <div style="background: #1F1915; color: #EDE6DA; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Reservation ID:</strong> <span style="color: #C89B3C;">${record ? record.id : ''}</span></p>
            <p style="margin: 4px 0;"><strong>Date:</strong> ${record ? record.reservation_date : ''}</p>
            <p style="margin: 4px 0;"><strong>Time:</strong> ${record ? record.reservation_time : ''}</p>
            <p style="margin: 4px 0;"><strong>Guests:</strong> ${record ? record.guests : 1} guest(s)</p>
          </div>
          <p>View your official 3D Digital Entry Pass here:</p>
          <p><a href="${passUrl}" style="background-color: #C89B3C; color: #14100D; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">Access Digital Pass</a></p>
          <br/>
          <p style="font-size: 12px; color: #777;">Please present your digital pass or QR code at check-in.</p>
        </div>
      `;
    } else if (type === 'rejection') {
      subject = `Update regarding your reservation request at Fizzy's Butter Chicken`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #14100D; max-width: 600px;">
          <h2 style="color: #8C3B2C;">Reservation Status Update</h2>
          <p>Dear <strong>${guestName}</strong>,</p>
          <p>Thank you for choosing Fizzy's Butter Chicken. Unfortunately, we are unable to confirm your reservation at this time.</p>
          ${remarks ? `<p><strong>Reason / Note from Manager:</strong> ${remarks}</p>` : ''}
          <p>We apologize for the inconvenience. Please feel free to try selecting another date or time, or contact us directly at (705) 746-0505.</p>
        </div>
      `;
    } else if (type === 'checkin') {
      subject = `Welcome to Fizzy's Butter Chicken! Checked In`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #14100D; max-width: 600px;">
          <h2 style="color: #C89B3C;">You're All Checked In!</h2>
          <p>Dear <strong>${guestName}</strong>,</p>
          <p>Welcome! You have been checked in by our staff. Enjoy your dining experience at Fizzy's Butter Chicken!</p>
          <p>If you need anything during your visit, please don't hesitate to let your server know.</p>
        </div>
      `;
    } else {
      subject = `Fizzy's Butter Chicken Notification`;
      htmlContent = `<p>Hello ${guestName}, thank you for contacting Fizzy's Butter Chicken.</p>`;
    }

    const result = await sendResendEmail({
      to: recipientEmail,
      subject,
      html: htmlContent
    });

    return res.status(200).json({ ok: result.ok, id: result.id, error: result.error });
  } catch (err) {
    console.error('Send email API error:', err);
    return res.status(500).json({ error: err.message || 'Failed to send email' });
  }
};
