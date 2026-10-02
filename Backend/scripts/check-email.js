import "dotenv/config";
import { verifyEmailTransport } from "../src/utils/email.js";
import { logEmailFailure } from "../src/services/emailErrors.js";
try {
  await verifyEmailTransport();
  console.log("SMTP connection and authentication succeeded. Inbox delivery still requires a signup/resend test.");
} catch (error) {
  logEmailFailure(error);
  process.exitCode = 1;
}
