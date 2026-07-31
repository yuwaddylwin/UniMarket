import nodemailer from "nodemailer";

const requiredSmtpVariables = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "EMAIL_FROM",
  "CLIENT_URL",
];

const getEmailConfig = () => {
  const missing = requiredSmtpVariables.filter(
    (variable) => !process.env[variable]?.trim()
  );

  if (missing.length > 0) {
    throw new Error(
      `Email service is not configured. Missing: ${missing.join(", ")}`
    );
  }

  const port = Number(process.env.SMTP_PORT);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("SMTP_PORT must be a valid port number");
  }

  return {
    port,
    clientUrl: process.env.CLIENT_URL.replace(/\/+$/, ""),
  };
};

const createTransporter = (port) =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

export const sendVerificationEmail = async (email, token) => {
  const { port, clientUrl } = getEmailConfig();
  const verificationUrl = `${clientUrl}/verify/${encodeURIComponent(token)}`;

  await createTransporter(port).sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Verify your UniMarket account",
    text: `Welcome to UniMarket!\n\nVerify your email by visiting this link:\n${verificationUrl}\n\nThis link expires in 24 hours.`,
    html: `
      <!doctype html>
      <html lang="en">
        <body style="margin:0;background:#f3f6fb;font-family:Arial,sans-serif;color:#1f2937;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#f3f6fb;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:36px;box-shadow:0 8px 24px rgba(0,0,0,.08);">
                  <tr>
                    <td>
                      <h1 style="margin:0 0 18px;color:#1b4a91;font-size:28px;">Welcome to UniMarket!</h1>
                      <p style="margin:0 0 24px;line-height:1.6;">Click the button below to verify your email.</p>
                      <a href="${verificationUrl}" style="display:inline-block;padding:13px 24px;border-radius:10px;background:#1b4a91;color:#ffffff;text-decoration:none;font-weight:700;">Verify email</a>
                      <p style="margin:24px 0 0;color:#6b7280;font-size:13px;line-height:1.5;">This verification link expires in 24 hours. If you did not create this account, you can ignore this email.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });
};
