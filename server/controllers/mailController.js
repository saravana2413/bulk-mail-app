import dns from "dns";
import nodemailer from "nodemailer";
import Email from "../models/Email.js";

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
    // 2. Resolve Gmail SMTP IPv4 address and create transporter
    // -----------------------------
    const [smtpAddress] = await dns.promises.resolve4("smtp.gmail.com");

    const transporter = nodemailer.createTransport({
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
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    // -----------------------------
    // 3. Verify SMTP connection
    // -----------------------------
    await transporter.verify();

    console.log("SMTP connection verified successfully");

    // -----------------------------
    // 4. Send email
    // -----------------------------
    const mailResult = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: recipients.join(","),
      subject: subject,
      text: body,
    });

    console.log("Email sent successfully:", mailResult.messageId);

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