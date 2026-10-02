import { Link } from "react-router-dom";
import { date, name, human, labels } from "./adminPresentation";

export function Status({ value }) {
  return (
    <span className={`admin-status admin-status--${value || "active"}`}>
      {human(value)}
    </span>
  );
}
export function Person({ user }) {
  return user?._id ? (
    <Link to={`/admin/users/${user._id}`}>
      {name(user)}
      {user.username && <small>@{user.username}</small>}
    </Link>
  ) : (
    <span>Deleted account</span>
  );
}
export function History({ rows = [] }) {
  return rows.length ? (
    <ul className="admin-history">
      {rows.map((row) => (
        <li key={row._id}>
          <div>
            <strong>{human(row.action || row.kind || "warning")}</strong>
            <span>{row.reason}</span>
            {row.userId && (
              <small>
                Account: <Person user={row.userId} />
              </small>
            )}
            {row.reportId && (
              <Link to={`/admin/reports/${row.reportId}`}>View report</Link>
            )}
            {row.adminNote && <small>Internal note: {row.adminNote}</small>}
          </div>
          <small>
            {name(row.adminId) === "Deleted account"
              ? "System / server setup"
              : name(row.adminId)}{" "}
            · {date(row.createdAt)}
            {row.until && <> · Until {date(row.until)}</>}
            {row.endedAt && <> · Ended {date(row.endedAt)}</>}
          </small>
        </li>
      ))}
    </ul>
  ) : (
    <p className="admin-empty">No moderation history.</p>
  );
}
export function ActionButtons({
  actions,
  targetId,
  listingType,
  targetName,
  choose,
}) {
  return (
    <div className="admin-actions">
      {actions.map((action) => (
        <button
          type="button"
          key={action}
          onClick={() =>
            choose({ action, targetId, listingType, name: targetName })
          }
        >
          {labels[action]}
        </button>
      ))}
    </div>
  );
}
export function ReportsTable({ rows }) {
  return (
    <div className="admin-table-scroll">
      <table>
        <thead>
          <tr>
            <th>Report / target</th>
            <th>Reporter</th>
            <th>Reported user</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Date</th>
            <th>Review</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row._id}>
              <td>
                <code title={row._id}>{row._id.slice(-8)}</code>
                <small>{human(row.targetKind)}</small>
              </td>
              <td>
                <Person user={row.reporterId} />
              </td>
              <td>
                <Person user={row.reportedId} />
              </td>
              <td>{row.reason}</td>
              <td>
                <Status value={row.status} />
              </td>
              <td>{date(row.createdAt)}</td>
              <td>
                <Link to={`/admin/reports/${row._id}`}>Review report</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="admin-empty">No reports match these filters.</p>
      )}
    </div>
  );
}
