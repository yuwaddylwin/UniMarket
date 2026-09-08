import nodemailer from "nodemailer";

const requiredSmtpVariables = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "EMAIL_FROM",
  "CLIENT_URL",
];

const SMTP_CONNECTION_TIMEOUT_MS = 10_000;
const SMTP_SOCKET_TIMEOUT_MS = 20_000;

let transporter;
let transporterConfigKey;
let transporterVerification;

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
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid port number");
  }

  return {
    host: process.env.SMTP_HOST.trim(),
    port,
    user: process.env.SMTP_USER.trim(),
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM.trim(),
    clientUrl: process.env.CLIENT_URL.trim().replace(/\/+$/, ""),
  };
};

const createTransporter = ({ host, port, user, pass }) =>
  nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    pool: true,
    maxConnections: 3,
    connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
    auth: {
      user,
      pass,
    },
  });

const getTransporter = async (config) => {
  const configKey = JSON.stringify([config.host, config.port, config.user, config.pass]);

  if (!transporter || transporterConfigKey !== configKey) {
    transporter?.close();
    transporter = createTransporter(config);
    transporterConfigKey = configKey;

    // Share the authentication probe across concurrent requests.
    transporterVerification = transporter.verify();
  }

  await transporterVerification;
  return transporter;
};

const resetTransporter = () => {
  transporter?.close();
  transporter = undefined;
  transporterConfigKey = undefined;
  transporterVerification = undefined;
};

const sendMail = async (config, message) => {
  let lastError;

  // Retry temporary failures only; authentication and policy failures need
  // configuration changes at the provider.
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const smtpTransporter = await getTransporter(config);
      const delivery = await smtpTransporter.sendMail(message);
      const recipientAccepted = delivery.accepted?.some(
        (accepted) => accepted.toLowerCase() === message.to.toLowerCase()
      );

      if (!recipientAccepted || delivery.rejected?.length > 0) {
        throw new Error("SMTP server did not accept the verification recipient");
      }

      return delivery;
    } catch (error) {
      lastError = error;
      resetTransporter();
      const response = `${error.response || ""} ${error.message || ""}`;
      if (/unauthorized ip|ip not authorized/i.test(response)) {
        throw new Error(
          "SMTP access blocked: authorize this backend's outbound IP in Brevo Settings > Security > Authorized IPs, then retry.",
          { cause: error }
        );
      }
      if (
        error.code === "EAUTH" ||
        Number(error.responseCode) >= 500 ||
        !["ETIMEDOUT", "ECONNECTION", "ESOCKET"].includes(error.code) &&
          !(Number(error.responseCode) >= 400 && Number(error.responseCode) < 500)
      ) {
        throw error;
      }
    }
  }

  throw lastError;
};

export const sendVerificationEmail = async (email, token) => {
  const config = getEmailConfig();
  const verificationUrl = `${config.clientUrl}/verify/${encodeURIComponent(token)}`;

  return sendMail(config, {
    from: config.from,
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

export const sendAuthCode = async (email, code, purpose) => {
  const config = getEmailConfig();
  return sendMail(config, {
    from: config.from, to: email, subject: `Your UniMarket ${purpose === 'reset' ? 'password reset' : 'verification'} code`,
    text: `Your UniMarket code is ${code}. It expires in 10 minutes and can only be used once. If you did not request this, ignore this email.`,
  });
};
