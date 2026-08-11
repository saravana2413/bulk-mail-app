import dns from "dns";
import nodemailer from "nodemailer";
import Email from "../models/Email.js";

const createGmailTransporter = async () => {
  const [smtpAddress] = await dns.promises.resolve4("smtp.gmail.com");

  const transporter465 = nodemailer.createTransport({
    host: smtpAddress,
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
    family: 4,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
  });

  try {
    await transporter465.verify();
    return transporter465;
  } catch (error) {
    console.warn("Gmail 465 verify failed, trying port 587:", error.message);
  }

  const transporter587 = nodemailer.createTransport({
    host: smtpAddress,
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
    family: 4,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
  });

  await transporter587.verify();
  return transporter587;
};

const sendViaSendGrid = async ({ subject, body, recipients }) => {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM;

  if (!apiKey || !fromEmail) {
    throw new Error("SendGrid is not configured. Set SENDGRID_API_KEY and SENDGRID_FROM.");
  }

  const payload = {
    personalizations: [
      {
        to: recipients.map((email) => ({ email })),
      },
    ],
    from: { email: fromEmail },
    subject,
    content: [{ type: "text/plain", value: body }],
  };

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SendGrid error ${response.status}: ${text}`);
  }

  return { messageId: `sendgrid-${Date.now()}` };
};

export const sendBulkMail = async (req, res) => {
  try {
    const { subject, body, recipients } = req.body;

    // -----------------------------
    // 1. Validate request
    // -----------------------------
    if (
      !subject ||
      !body ||
      !recipients ||
      !Array.isArray(recipients) ||
      recipients.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Subject, body and recipients are required",
      });
    }

    // -----------------------------
    // 2. Try Gmail SMTP, fall back to SendGrid if SMTP is blocked
    // -----------------------------
    let mailResult;

    try {
      const transporter = await createGmailTransporter();
      console.log("Using Gmail SMTP transporter");

      mailResult = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: recipients.join(","),
        subject: subject,
        text: body,
      });

      console.log("Email sent successfully via Gmail SMTP:", mailResult.messageId);
    } catch (smtpError) {
      console.warn("Gmail SMTP failed:", smtpError.message);

      if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM) {
        console.log("Falling back to SendGrid");
        mailResult = await sendViaSendGrid({ subject, body, recipients });
      } else {
        throw smtpError;
      }
    }

    // -----------------------------
    // 5. Save successful email
    // -----------------------------
    const emailRecord = await Email.create({
      subject,
      body,
      recipients,
      status: "sent",
    });

    // -----------------------------
    // 6. Send success response
    // -----------------------------
    return res.status(200).json({
      success: true,
      message: "Bulk email sent successfully",
      email: emailRecord,
    });
  } catch (error) {
    // -----------------------------
    // 7. Log actual error
    // -----------------------------
    console.error("=================================");
    console.error("BULK MAIL ERROR");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Command:", error.command);
    console.error("Response:", error.response);
    console.error("=================================");

    // -----------------------------
    // 8. Try to save failed record
    // -----------------------------
    try {
      const { subject, body, recipients } = req.body;

      await Email.create({
        subject: subject || "",
        body: body || "",
        recipients: Array.isArray(recipients) ? recipients : [],
        status: "failed",
      });

      console.log("Failed email record saved to MongoDB");
    } catch (dbError) {
      console.error(
        "Failed to save email record:",
        dbError.message
      );
    }

    // -----------------------------
    // 9. Send error response
    // -----------------------------
    return res.status(500).json({
      success: false,
      message: "Failed to send bulk email",
      error: error.message,
    });
  }
};