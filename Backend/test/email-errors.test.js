import { test } from "node:test";
import assert from "node:assert/strict";
import { emailFailure, logEmailFailure } from "../src/services/emailErrors.js";
import { verifyEmailTransport } from "../src/utils/email.js";

test("SMTP failures are classified without leaking provider responses or secrets", (t) => {
  const logs = [];
  t.mock.method(console, "error", (...args) => logs.push(args));
  const failure = logEmailFailure({ code: "EAUTH", responseCode: 525, response: "unauthorized ip secret@example.test password=secret PIN 123456" });
  assert.equal(failure.reason, "ip_not_authorized");
  assert.equal(failure.status, 502);
  assert.doesNotMatch(JSON.stringify(logs), /secret|123456/);
  assert.equal(emailFailure({ code: "EAUTH" }).reason, "authentication");
  assert.equal(emailFailure({ code: "ETIMEDOUT" }).reason, "connection");
  assert.equal(emailFailure({ code: "EMAIL_CONFIG" }).status, 503);
});
test("missing backend configuration fails before SMTP connection", async () => {
  const previous = process.env.SMTP_HOST;
  delete process.env.SMTP_HOST;
  try { await assert.rejects(verifyEmailTransport(), { code: "EMAIL_CONFIG" }); }
  finally { if (previous !== undefined) process.env.SMTP_HOST = previous; }
});
