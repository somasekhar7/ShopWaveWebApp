import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // e.g., 'smtp.gmail.com'
  port: process.env.SMTP_PORT, // e.g., 587
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER, // Your email (e.g., Gmail account or SMTP server credentials)
    pass: process.env.SMTP_PASSWORD, // Your email password or app-specific password
  },
});

// Function to send email
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL, // Sender address (use your verified sender email)
      to, // Recipient email
      subject, // Subject line
      text, // Plain text body
      html, // HTML body
    });

    console.log("Message sent: %s", info.messageId);
    return true; // Email sent successfully
  } catch (error) {
    console.error("Error sending email:", error);
    return false; // Email failed to send
  }
};

export default sendEmail;
