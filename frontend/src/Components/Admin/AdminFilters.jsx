import { reasons, human } from "./adminPresentation";

export default function Filters({ section, params, setParams }) {
  const change = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setParams(next, { replace: true });
  };
  const reports = ["reports", "chat-reports"].includes(section),
    users = ["users", "restricted"].includes(section);
  return (
    <div className="admin-filters">
      {(reports || users || section === "listings") && (
        <label>
          Search
          <input
            type="search"
            placeholder={users ? "Name, username or email" : "Search records"}
            value={params.get("q") || ""}
            onChange={(e) => change("q", e.target.value)}
          />
        </label>
      )}
      {(reports || users || section === "listings") && (
        <label>
          Status
          <select
            value={params.get("status") || ""}
            onChange={(e) => change("status", e.target.value)}
          >
            <option value="">
              All{" "}
              {section === "restricted" ? "restricted accounts" : "statuses"}
            </option>
            {(reports
              ? ["pending", "under_review", "resolved", "dismissed"]
              : users
                ? ["active", "warned", "frozen", "suspended"]
                : ["active", "sold", "hidden", "removed", "under_review"]
            ).map((value) => (
              <option key={value} value={value}>
                {human(value)}
              </option>
            ))}
          </select>
        </label>
      )}
      {reports && (
        <label>
          Reason
          <select
            value={params.get("reason") || ""}
            onChange={(e) => change("reason", e.target.value)}
          >
            <option value="">All reasons</option>
            {reasons.map((reason) => (
              <option key={reason}>{reason}</option>
            ))}
          </select>
        </label>
      )}
      {section === "listings" && (
        <>
          <label>
            Listing type
            <select
              value={params.get("kind") || "item"}
              onChange={(e) => change("kind", e.target.value)}
            >
              <option value="item">Items</option>
              <option value="accommodation">Accommodation</option>
            </select>
          </label>
          <label>
            Category
            <input
              value={params.get("category") || ""}
              onChange={(e) => change("category", e.target.value)}
              placeholder="Exact category or housing type"
            />
          </label>
          <label>
            Reports
            <select
              value={params.get("reported") || ""}
              onChange={(e) => change("reported", e.target.value)}
            >
              <option value="">All listings</option>
              <option value="true">Unresolved reports</option>
            </select>
          </label>
          <label>
            Sort by
            <select
              value={params.get("sort") || "newest"}
              onChange={(e) => change("sort", e.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="reports">Most reports</option>
            </select>
          </label>
        </>
      )}
      {!users && section !== "listings" && (
        <>
          <label>
            From
            <input
              type="date"
              value={params.get("from") || ""}
              onChange={(e) => change("from", e.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={params.get("to") || ""}
              onChange={(e) => change("to", e.target.value)}
            />
          </label>
        </>
      )}
      {!users && (
        <label>
          User ID
          <input
            value={params.get("user") || ""}
            onChange={(e) => change("user", e.target.value)}
            placeholder="Filter by user ID"
          />
        </label>
      )}
      {reports && (
        <label>
          Listing ID
          <input
            value={params.get("listing") || ""}
            onChange={(e) => change("listing", e.target.value)}
            placeholder="Filter by listing ID"
          />
        </label>
      )}
      <button onClick={() => setParams({})}>Clear filters</button>
    </div>
  );
}
