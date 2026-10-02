import { useEffect, useState } from "react";
import { Flag } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/useAuthStore";
import { axiosInstance } from "../../lib/axios";
import SafetyDialog from "./SafetyDialog";
import "./ReportDialog.css";
export function ReportDialog({ targetKind, targetId, onClose }) {
  const [reasons, setReasons] = useState([]),
    [reason, setReason] = useState(""),
    [description, setDescription] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    axiosInstance
      .get("/reports/reasons")
      .then((res) => {
        if (live) setReasons(res.data);
      })
      .catch(() => {
        if (live)
          setError(
            "Unable to load report reasons. Close this dialog and try again."
          );
      });
    return () => {
      live = false;
    };
  }, []);
  return (
    <SafetyDialog
      title={`Report ${targetKind}`}
      description="Help us keep UniMarket safe. Reports are reviewed by the moderation team."
      confirmLabel="Submit report"
      onClose={onClose}
      onConfirm={async () => {
        if (!reason) throw new Error("Choose a report reason.");
        await axiosInstance.post("/reports", {
          targetKind,
          targetId,
          reason,
          description,
        });
        toast.success("Report submitted for review");
      }}
    >
      <label className="report-field">
        Reason
        <select
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          <option value="">Choose a reason</option>
          {reasons.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <label className="report-field">
        Additional details (optional)
        <textarea
          rows={4}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      {error && <p role="alert">{error}</p>}
    </SafetyDialog>
  );
}
export function ReportButton({
  targetKind,
  targetId,
  ownerId,
  compact = false,
}) {
  const user = useAuthStore((state) => state.authUser),
    [open, setOpen] = useState(false);
  if (!user || String(user._id) === String(ownerId) || !targetId) return null;
  return (
    <>
      <button
        type="button"
        className={`report-content-button${compact ? " is-compact" : ""}`}
        onClick={() => setOpen(true)}
        aria-label={`Report ${targetKind}`}
      >
        <Flag size={compact ? 12 : 15} />
        {!compact && `Report ${targetKind}`}
      </button>
      {open && (
        <ReportDialog
          targetKind={targetKind}
          targetId={targetId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
