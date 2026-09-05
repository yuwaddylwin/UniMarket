import Report from '../models/report.model.js';
import User from '../models/user.model.js';
import { sendReportEmail } from '../utils/email.js';
let running = false;
export async function deliverReportNotifications() {
  if (running) return;
  running = true;
  try {
    // Durable claim prevents simultaneous workers sending the same report.
    const report = await Report.findOneAndUpdate({ notificationSentAt: null, notificationRetryAt: { $lte: new Date() } },
      { $set: { notificationRetryAt: new Date(Date.now() + 300000) }, $inc: { notificationAttempts: 1 } }, { new: true });
    if (!report) return;
    try {
      const [reporter, reported] = await Promise.all([User.findById(report.reporterId), User.findById(report.reportedId)]);
      await sendReportEmail(report, reporter, reported);
      await Report.updateOne({ _id: report._id }, { $set: { notificationSentAt: new Date() } });
    } catch (error) { console.error('Report email delivery failed; queued for retry:', report._id, error.message); }
  } catch (error) { console.error('Report notification worker failed:', error.message); }
  finally { running = false; }
}
export function startReportNotifications() {
  void deliverReportNotifications();
  const timer = setInterval(deliverReportNotifications, 30000);
  timer.unref();
}
