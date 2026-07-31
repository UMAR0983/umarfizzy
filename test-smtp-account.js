const nodemailer = require('nodemailer');

const appPass = 'eplhcnvwlkdkbtdz';
const accounts = [
  'fizzybutterchicken@gmail.com',
  'umarkhatabmalik2156@gmail.com',
  'zakiulhassan105@gmail.com'
];

async function testAccounts() {
  console.log('Testing App Password: eplhcnvwlkdkbtdz for fizzybutterchicken@gmail.com...\n');

  // Test 1: Service gmail (port 465 default)
  console.log('Testing with host smtp.gmail.com port 465 (SSL)...');
  const transporterSSL = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'fizzybutterchicken@gmail.com',
      pass: 'eplhcnvwlkdkbtdz'
    }
  });

  try {
    await transporterSSL.verify();
    console.log('🎉 SUCCESS! Port 465 (SSL) verified successfully!');
    return true;
  } catch (err) {
    console.log('❌ Port 465 error:', err.message);
  }

  // Test 2: Port 587 TLS
  console.log('\nTesting with host smtp.gmail.com port 587 (TLS)...');
  const transporterTLS = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'fizzybutterchicken@gmail.com',
      pass: 'eplhcnvwlkdkbtdz'
    }
  });

  try {
    await transporterTLS.verify();
    console.log('🎉 SUCCESS! Port 587 (TLS) verified successfully!');
    return true;
  } catch (err) {
    console.log('❌ Port 587 error:', err.message);
  }
}

testAccounts();
