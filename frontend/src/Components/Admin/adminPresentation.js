export const sections = [
  ["", "Dashboard"],
  ["reports", "Reports"],
  ["users", "Users"],
  ["listings", "Listings"],
  ["chat-reports", "Messages / Chat Reports"],
  ["warnings", "Warnings"],
  ["restricted", "Suspended / Frozen Accounts"],
  ["activity", "Activity / Moderation Log"],
  ["settings", "Settings"],
];
export const reasons = [
  "Scam / Fraud",
  "Harassment",
  "Spam",
  "Inappropriate content",
  "Fake listing",
  "Prohibited item",
  "Misleading information",
  "Suspicious behavior",
  "Other",
];
export const labels = {
  warn: "Warn user",
  freeze: "Freeze account",
  unfreeze: "Unfreeze account",
  suspend: "Suspend account",
  restore_account: "Restore account",
  hide: "Hide listing",
  remove: "Remove listing",
  under_review: "Place listing under review",
  restore_listing: "Restore listing",
  review_report: "Start review",
  resolve_report: "Resolve report",
  dismiss_report: "Dismiss report",
};
export const date = (value) => (value ? new Date(value).toLocaleString() : "—");
export const name = (user) =>
  user?.fullName || user?.username || "Deleted account";
export const human = (value) => String(value || "active").replaceAll("_", " ");
