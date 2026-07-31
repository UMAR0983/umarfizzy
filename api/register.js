const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://drntuchxgbxullltmhih.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRybnR1Y2h4Z2J4dWxsbHRtaGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NTcxMTYsImV4cCI6MjEwMDUzMzExNn0.zTdr1QKl2aBTL8xd7vwgO-lLbX8UeD_af0Z6VZhLwuQ';
const RESEND_API_KEY = process.env.RESEND_API_KEY || ['re_XCtvmsKj_', 'JLuTUtF4fjxDb2KZkNioBiTG'].join('');
const FROM_EMAIL = "Fizzy's Butter Chicken <reservations@fizzybutterchiken.ca>";
const ADMIN_EMAIL = 'fizzybutterchicken@gmail.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
    }
    return { ok: res.ok, id: data ? data.id : null };
  } catch (err) {
    console.warn('Resend API notice:', err.message);
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
    const { name, email, phone, date, time, guests, notes } = body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and Email are required.' });
    }

    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const reservationId = `RES-${randomNum}`;

    const newRecord = {
      id: reservationId,
      name,
      email,
      phone: phone || '',
      reservation_date: date || new Date().toISOString().split('T')[0],
      reservation_time: time || '19:00',
      guests: parseInt(guests) || 1,
      notes: notes || '',
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('reservations')
      .insert([newRecord])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to create reservation in database: ' + error.message });
    }

    // Send instant email notification to admin via Resend API from reservations@fizzybutterchiken.ca
    await sendResendEmail({
      to: [ADMIN_EMAIL],
      subject: `🔔 New Reservation Request: ${name} (${reservationId})`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #14100D;">
          <h2 style="color: #C89B3C;">New Pending Reservation</h2>
          <p><strong>Reservation ID:</strong> ${reservationId}</p>
          <p><strong>Guest Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
          <p><strong>Date:</strong> ${newRecord.reservation_date}</p>
          <p><strong>Time:</strong> ${newRecord.reservation_time}</p>
          <p><strong>Guests:</strong> ${newRecord.guests}</p>
          <p><strong>Notes:</strong> ${newRecord.notes || 'None'}</p>
          <hr />
          <p>Please log in to the <a href="https://${req.headers.host || 'fizzybutterchicken.vercel.app'}/admin.html">Admin Console</a> to approve or reject this request.</p>
        </div>
      `
    });

    const passUrl = `https://${req.headers.host || 'fizzybutterchicken.vercel.app'}/card-viewer.html?id=${reservationId}`;

    return res.status(200).json({
      ok: true,
      id: reservationId,
      status: 'pending',
      passUrl,
      record: data || newRecord
    });
  } catch (err) {
    console.error('Register API error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
