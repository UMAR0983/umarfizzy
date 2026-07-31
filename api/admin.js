const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

// Hardcoded Configuration
const SUPABASE_URL = 'https://drntuchxgbxullltmhih.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRybnR1Y2h4Z2J4dWxsbHRtaGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NTcxMTYsImV4cCI6MjEwMDUzMzExNn0.zTdr1QKl2aBTL8xd7vwgO-lLbX8UeD_af0Z6VZhLwuQ';
const ADMIN_SECRET = 'admin123secret';
const GMAIL_USER = 'fizzybutterchicken@gmail.com';
const GMAIL_APP_PASS = 'eplhcnvwlkdkbtdz';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASS
    }
  });
}

function verifyAuth(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return false;
  if (token === ADMIN_SECRET || token === 'admin123' || token === 'admin123secret' || token === 'fizzy123' || token === 'staff123') {
    return true;
  }
  return false;
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

  if (!verifyAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized. Invalid admin token.' });
  }

  const action = req.query.action || 'list';

  try {
    if (req.method === 'GET' && action === 'list') {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json({ ok: true, records: data || [] });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { id, adminName, remarks, status } = body;

      if (!id) {
        return res.status(400).json({ error: 'Reservation ID is required.' });
      }

      if (action === 'approve') {
        const { data, error } = await supabase
          .from('reservations')
          .update({
            status: 'approved',
            verified_by: adminName || 'Admin',
            verified_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          return res.status(500).json({ error: error.message });
        }

        // Trigger approval email to guest
        if (data && data.email) {
          try {
            const transporter = getTransporter();
            const host = req.headers.host || 'fizzybutterchicken.vercel.app';
            const passUrl = `https://${host}/card-viewer.html?id=${data.id}`;

            await transporter.sendMail({
              from: `"Fizzy's Butter Chicken" <${GMAIL_USER}>`,
              to: data.email,
              subject: `🎉 Reservation Approved! Your Pass for Fizzy's Butter Chicken`,
              html: `
                <div style="font-family: Arial, sans-serif; padding: 24px; color: #14100D; max-width: 600px; border: 1px solid #C89B3C; border-radius: 8px;">
                  <h2 style="color: #C89B3C; margin-top: 0;">Reservation Approved!</h2>
                  <p>Dear <strong>${data.name}</strong>,</p>
                  <p>We are delighted to confirm your reservation at <strong>Fizzy's Butter Chicken</strong>!</p>
                  <div style="background: #1F1915; color: #EDE6DA; padding: 16px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 4px 0;"><strong>Reservation ID:</strong> <span style="color: #C89B3C;">${data.id}</span></p>
                    <p style="margin: 4px 0;"><strong>Date:</strong> ${data.reservation_date}</p>
                    <p style="margin: 4px 0;"><strong>Time:</strong> ${data.reservation_time}</p>
                    <p style="margin: 4px 0;"><strong>Guests:</strong> ${data.guests} guest(s)</p>
                  </div>
                  <p>View your official 3D Digital Entry Pass here:</p>
                  <p><a href="${passUrl}" style="background-color: #C89B3C; color: #14100D; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">Access Digital Pass</a></p>
                  <br/>
                  <p style="font-size: 12px; color: #777;">Please present your digital pass or QR code at check-in.</p>
                </div>
              `
            });
          } catch (emailErr) {
            console.warn('Approval email error:', emailErr.message);
          }
        }

        return res.status(200).json({ ok: true, record: data });
      }

      if (action === 'reject') {
        const { data, error } = await supabase
          .from('reservations')
          .update({
            status: 'rejected',
            remarks: remarks || 'Unable to confirm at this time'
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          return res.status(500).json({ error: error.message });
        }

        // Trigger rejection email to guest
        if (data && data.email) {
          try {
            const transporter = getTransporter();
            await transporter.sendMail({
              from: `"Fizzy's Butter Chicken" <${GMAIL_USER}>`,
              to: data.email,
              subject: `Update regarding your reservation request at Fizzy's Butter Chicken`,
              html: `
                <div style="font-family: Arial, sans-serif; padding: 24px; color: #14100D; max-width: 600px;">
                  <h2 style="color: #8C3B2C;">Reservation Status Update</h2>
                  <p>Dear <strong>${data.name}</strong>,</p>
                  <p>Thank you for choosing Fizzy's Butter Chicken. Unfortunately, we are unable to confirm your reservation for ${data.reservation_date} at ${data.reservation_time}.</p>
                  ${remarks ? `<p><strong>Reason / Note:</strong> ${remarks}</p>` : ''}
                  <p>We apologize for the inconvenience. Please feel free to select another date or contact us directly at (705) 746-0505.</p>
                </div>
              `
            });
          } catch (emailErr) {
            console.warn('Rejection email error:', emailErr.message);
          }
        }

        return res.status(200).json({ ok: true, record: data });
      }

      if (action === 'update_status') {
        const newStatus = status || 'checked_in';
        const { data, error } = await supabase
          .from('reservations')
          .update({ status: newStatus })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          return res.status(500).json({ error: error.message });
        }
        return res.status(200).json({ ok: true, record: data });
      }

      return res.status(400).json({ error: 'Invalid action parameter.' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Admin API error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
