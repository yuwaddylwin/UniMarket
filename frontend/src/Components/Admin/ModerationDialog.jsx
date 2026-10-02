import { useState } from "react";
import toast from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";
import SafetyDialog from "../common/SafetyDialog";
import { labels } from "./adminPresentation";

export default function ModerationDialog({ action, onClose, onDone }) {
  const [duration, setDuration] = useState("7"),
    [until, setUntil] = useState(""),
    [adminNote, setAdminNote] = useState("");
  return (
    <SafetyDialog
      title={`${labels[action.action]}?`}
      description={`Confirm this action for ${action.name || "this record"}. The reason is recorded in moderation history and may be shown to the affected user.`}
      report
      confirmLabel={labels[action.action]}
      onClose={onClose}
      onConfirm={async (reason) => {
        const end =
          duration === "custom"
            ? new Date(until)
            : new Date(Date.now() + Number(duration) * 86400000);
        if (
          action.action === "freeze" &&
          (!Number.isFinite(end.getTime()) || end <= new Date())
        )
          throw new Error("Choose a future freeze end time.");
        await axiosInstance.post("/admin/actions", {
          ...action,
          reason,
          adminNote,
          ...(action.action === "freeze" ? { until: end.toISOString() } : {}),
        });
        toast.success("Moderation action recorded");
        onDone();
      }}
    >
      {action.action === "freeze" && (
        <label className="admin-field">
          Freeze duration
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          >
            <option value="1">24 hours</option>
            <option value="3">3 days</option>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="custom">Custom end time</option>
          </select>
          {duration === "custom" && (
            <input
              aria-label="Freeze end time"
              type="datetime-local"
              required
              value={until}
              onChange={(e) => setUntil(e.target.value)}
            />
          )}
        </label>
      )}
      <label className="admin-field">
        Internal admin note (optional)
        <textarea
          rows={3}
          maxLength={2000}
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
        />
      </label>
    </SafetyDialog>
  );
}
