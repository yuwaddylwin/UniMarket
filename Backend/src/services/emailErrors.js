// Only allowlisted metadata is logged. Never log SMTP responses, recipients,
// credentials, message bodies, PINs, or link tokens.
export function emailFailure(error) {
  const details = `${error?.response || ""} ${error?.message || ""}`;
  const code = error?.code;
  if (code === "EMAIL_CONFIG")
    return { reason: "configuration", status: 503, hint: "Check backend SMTP variables, EMAIL_FROM and CLIENT_URL." };
  if (/unauthorized ip|ip not authorized/i.test(details))
    return { reason: "ip_not_authorized", status: 502, hint: "Authorize this backend's outbound IP in the SMTP provider security settings." };
  if (code === "EAUTH")
    return { reason: "authentication", status: 502, hint: "Check the provider SMTP login and SMTP key, not an API key or account password." };
  if (["ETIMEDOUT", "ECONNECTION", "ESOCKET", "EDNS"].includes(code))
    return { reason: "connection", status: 502, hint: "Check SMTP DNS, port access and provider availability." };
  return { reason: "delivery", status: 502, hint: "Check the provider's transactional email logs and verified sender." };
}
export function logEmailFailure(error) {
  const failure = emailFailure(error);
  console.error("Email delivery failed", {
    reason: failure.reason,
    ...(Number.isInteger(error?.responseCode) ? { smtpStatus: error.responseCode } : {}),
    hint: failure.hint,
  });
  return failure;
}
