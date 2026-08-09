import nodemailer from "nodemailer";
import Email from "../models/Email.js";

export const sendBulkMail = async (req, res) => {
  try {
    const { subject, body, recipients } = req.body;

    // Basic validation
    if (!subject || !body || !recipients || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Subject, body and recipients are required"
      });
    }

    // Create email transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: recipients.join(","),
      subject: subject,
      text: body
    });

    // Save successful email record
    const emailRecord = await Email.create({
      subject,
      body,
      recipients,
      status: "sent"
    });

    res.status(200).json({
      success: true,
      message: "Bulk email sent successfully",
      email: emailRecord
    });
  } catch (error) {
    console.error("Bulk mail error:", error.message);

    // Try to save failed record
    try {
      const { subject, body, recipients } = req.body;

      await Email.create({
        subject: subject || "",
        body: body || "",
        recipients: recipients || [],
        status: "failed"
      });
    } catch (dbError) {
      console.error("Failed to save email record:", dbError.message);
    }

    res.status(500).json({
      success: false,
      message: "Failed to send bulk email"
    });
  }
};