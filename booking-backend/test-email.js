const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmailSending() {
  console.log(' Testing SMTP Connection...\n');

  // Create transporter with .env configuration
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    // Step 1: Verify SMTP connection
    console.log('Step 1: Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!\n');

    // Step 2: Send test email
    console.log('Step 2: Sending test email...');
    const testEmail = process.env.SMTP_USER; // Send to yourself for testing
    
    const info = await transporter.sendMail({
      from: `"Booking System Test" <${process.env.SMTP_FROM}>`,
      to: testEmail,
      subject: '🧪 Test Email - Booking System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4A90D9;">Test Email</h1>
          <p>This is a test email from the Booking System.</p>
          <p><strong>Test Details:</strong></p>
          <ul>
            <li>Time: ${new Date().toLocaleString()}</li>
            <li>Environment: ${process.env.NODE_ENV || 'development'}</li>
            <li>SMTP Host: ${process.env.SMTP_HOST}</li>
            <li>SMTP Port: ${process.env.SMTP_PORT}</li>
          </ul>
          <p>If you received this email, the SMTP configuration is working correctly! ✅</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">This is an automated test email from the Booking System.</p>
        </div>
      `,
      text: `
Test Email - Booking System

This is a test email from the Booking System.

Test Details:
- Time: ${new Date().toLocaleString()}
- Environment: ${process.env.NODE_ENV || 'development'}
- SMTP Host: ${process.env.SMTP_HOST}
- SMTP Port: ${process.env.SMTP_PORT}

If you received this email, the SMTP configuration is working correctly! ✅

This is an automated test email from the Booking System.
      `,
    });

    console.log('✅ Test email sent successfully!');
    console.log(`📧 Message ID: ${info.messageId}`);
    console.log(`📬 To: ${testEmail}`);
    console.log(`⏰ Sent at: ${new Date().toLocaleString()}\n`);

    console.log('🎉 All tests passed! Email service is working correctly.');
    console.log('📬 Please check your inbox (and spam folder) for the test email.');

  } catch (error) {
    console.error('❌ Test failed!');
    console.error('Error details:');
    console.error(`Message: ${error.message}`);
    
    if (error.code) {
      console.error(`Code: ${error.code}`);
    }
    
    if (error.response) {
      console.error(`Response: ${error.response}`);
    }

    console.error('\n🔍 Troubleshooting tips:');
    console.error('1. Check if SMTP credentials are correct in .env file');
    console.error('2. Verify that "Less secure app access" is enabled (for Gmail)');
    console.error('3. Check if 2FA is enabled - you may need an App Password');
    console.error('4. Ensure the email account has sending permissions');
    console.error('5. Check your internet connection');

    process.exit(1);
  } finally {
    await transporter.close();
  }
}

// Run the test
testEmailSending();
