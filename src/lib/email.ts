import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

// Only configure transporter if credentials are present to avoid runtime errors in dev/demo
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  try {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  } catch (e) {
    console.warn('Failed to initialize email transporter', e)
    transporter = null
  }
} else {
  console.warn('SMTP credentials not set; email notifications disabled')
}

export async function sendApprovalNotification(email: string, userName: string) {
  if (!transporter) {
    return // silently skip in environments without SMTP
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@churchapp.com',
    to: email,
    subject: 'Your Account Has Been Approved',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Account Approved</h2>
        <p>Dear ${userName},</p>
        <p>Your church account has been approved!</p>
        <p>Click the button below to log in:</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Login</a>
        <p style="margin-top: 20px; color: #666;">God bless!</p>
      </div>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
  } catch (e) {
    console.warn('Failed to send approval email to', email, e)
  }
}