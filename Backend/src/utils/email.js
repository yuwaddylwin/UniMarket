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
    throw Object.assign(new Error("Email service configuration is incomplete."), { code: "EMAIL_CONFIG" });
  }

  const port = Number(process.env.SMTP_PORT);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw Object.assign(new Error("SMTP_PORT must be a valid port number"), { code: "EMAIL_CONFIG" });
  }

  try {
    const url = new URL(process.env.CLIENT_URL);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error();
  } catch {
    throw Object.assign(new Error("CLIENT_URL must be a frontend origin."), { code: "EMAIL_CONFIG" });
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
  const configKey = JSON.stringify([
    config.host,
    config.port,
    config.user,
    config.pass,
  ]);

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
        throw new Error(
          "SMTP server did not accept the verification recipient"
        );
      }

      return delivery;
    } catch (error) {
      lastError = error;
      resetTransporter();
      if (
        error.code === "EAUTH" ||
        Number(error.responseCode) >= 500 ||
        (!["ETIMEDOUT", "ECONNECTION", "ESOCKET"].includes(error.code) &&
          !(
            Number(error.responseCode) >= 400 &&
            Number(error.responseCode) < 500
          ))
      ) {
        throw error;
      }
    }
  }

  throw lastError;
};

export const sendAuthCode = async (email, code, purpose, linkToken = "") => {
  const config = getEmailConfig();
  const verificationUrl = linkToken
    ? `${config.clientUrl}/verify/${encodeURIComponent(linkToken)}`
    : "";
  const title = purpose === "reset" ? "Reset your password" : "Verify your email";
  return sendMail(config, {
    from: config.from,
    to: email,
    subject: `Your UniMarket ${purpose === "reset" ? "password reset" : "verification"} code`,
    text: `Your UniMarket code is ${code}. It expires in 10 minutes and can only be used once.${verificationUrl ? `\nOr verify your email: ${verificationUrl}` : ""} If you did not request this, ignore this email.`,
    html: `<div style="background:#f3f6fb;padding:32px;font-family:Arial,sans-serif;color:#1f2937"><div style="max-width:520px;margin:auto;background:white;padding:32px;border-radius:16px"><h1 style="color:#1b4a91">UniMarket</h1><h2>${title}</h2><p>Enter this code in UniMarket to ${purpose === "reset" ? "reset your password" : "activate your account"}:</p><p style="font-size:32px;letter-spacing:8px;font-weight:bold">${code}</p>${verificationUrl ? `<p><a href="${verificationUrl}" style="color:#1b4a91">Verify email</a></p>` : ""}<p>This code${verificationUrl ? " and link expire" : " expires"} in 10 minutes. Verification can only be completed once.</p><p>If you did not request this, you can ignore this email.</p></div></div>`,
  });
};

// A connection/authentication probe; does not send email or print credentials.
export async function verifyEmailTransport() {
  const config = getEmailConfig();
  const probe = createTransporter(config);
  try { await probe.verify(); } finally { probe.close(); }
}
