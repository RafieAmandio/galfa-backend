import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

let transporter: Transporter | null = null;

function getEmailConfig(): EmailConfig {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP configuration is incomplete. Please set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD environment variables."
    );
  }

  return {
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  };
}

function getTransporter(): Transporter {
  if (!transporter) {
    const config = getEmailConfig();
    transporter = nodemailer.createTransport(config);
  }
  return transporter;
}

export async function sendEmail(
  options: EmailOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transport = getTransporter();
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
    const fromName = process.env.SMTP_FROM_NAME || "Galfa Investment Platform";

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    };

    const info = await transport.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("Email sending error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

export async function sendReportEmail(
  investorEmail: string,
  pdfBuffer: Buffer,
  pdfFilename: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return sendEmail({
    to: investorEmail,
    subject: `Your Investment Portfolio Report - ${currentDate}`,
    text: `Dear Investor,

Please find attached your investment portfolio report generated on ${currentDate}.

This report contains a comprehensive summary of your investments including:
- Portfolio overview and performance metrics
- Flat rate investments details
- Floating rate investments details
- Installment investments details

If you have any questions about your portfolio, please contact your investment advisor.

Best regards,
Galfa Investment Platform`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Your Investment Portfolio Report</h2>
        <p>Dear Investor,</p>
        <p>Please find attached your investment portfolio report generated on <strong>${currentDate}</strong>.</p>
        <p>This report contains a comprehensive summary of your investments including:</p>
        <ul>
          <li>Portfolio overview and performance metrics</li>
          <li>Flat rate investments details</li>
          <li>Floating rate investments details</li>
          <li>Installment investments details</li>
        </ul>
        <p>If you have any questions about your portfolio, please contact your investment advisor.</p>
        <br/>
        <p>Best regards,<br/><strong>Galfa Investment Platform</strong></p>
        <hr style="margin-top: 30px; border: none; border-top: 1px solid #e5e7eb;"/>
        <p style="color: #6b7280; font-size: 12px;">
          This is an automated email from Galfa Investment Platform. Please do not reply to this email.
        </p>
      </div>
    `,
    attachments: [
      {
        filename: pdfFilename,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

export async function verifySmtpConnection(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const transport = getTransporter();
    await transport.verify();
    return { success: true };
  } catch (error) {
    console.error("SMTP verification error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "SMTP verification failed",
    };
  }
}
