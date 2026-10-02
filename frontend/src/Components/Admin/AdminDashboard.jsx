import { useCallback, useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ShieldCheck, Menu, ArrowLeft, RefreshCw } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { axiosInstance } from "../../lib/axios";
import ProfileAvatar from "../common/ProfileAvatar";
import { sections, date, name } from "./adminPresentation";
import {
  Status,
  Person,
  History,
  ActionButtons,
  ReportsTable,
} from "./AdminShared";
import ModerationDialog from "./ModerationDialog";
import Filters from "./AdminFilters";
import "./AdminDashboard.css";
export default function AdminDashboard() {
  const { authUser } = useAuthStore();
  const location = useLocation(),
    navigate = useNavigate();
  const { "*": path = "" } = useParams();
  const [section = "", detailId] = path.split("/");
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false),
    [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [version, setVersion] = useState(0),
    [action, setAction] = useState(null);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const query = params.toString();
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (authUser?.role !== "admin") return;
    let live = true;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const queryParams = new URLSearchParams(query);
    if (section === "chat-reports") queryParams.set("kind", "chat");
    if (section === "restricted" && !queryParams.get("status"))
      queryParams.set("status", "restricted");
    const resource =
      section === "chat-reports"
        ? "reports"
        : section === "restricted"
          ? "users"
          : section || "dashboard";
    const timer = setTimeout(
      () =>
        axiosInstance
          .get(
            `/admin/${resource}${detailId ? `/${detailId}` : ""}?${queryParams}`,
            { signal: controller.signal }
          )
          .then((response) => {
            if (live) setData(response.data);
          })
          .catch((err) => {
            if (live) {
              setData(null);
              setError(
                err.response?.data?.message ||
                  "Unable to load this page. Please try again."
              );
              if (err.response?.status === 401)
                navigate("/login", { state: { from: location.pathname } });
            }
          })
          .finally(() => {
            if (live) setLoading(false);
          }),
      180
    );
    return () => {
      live = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    authUser?.role,
    section,
    detailId,
    query,
    version,
    navigate,
    location.pathname,
  ]);
  if (!authUser)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (authUser.role !== "admin")
    return (
      <main className="admin-denied">
        <ShieldCheck size={40} />
        <h1>Administrator access required</h1>
        <p>Your account does not have permission to open this page.</p>
        <Link to="/">Return to UniMarket</Link>
      </main>
    );
  const title = detailId
    ? section === "reports"
      ? "Report review"
      : "User moderation profile"
    : sections.find(([key]) => key === section)?.[1] || "Not found";
  const actionsFor = (user) =>
    user?.role === "admin"
      ? []
      : [
          "warn",
          ...(["frozen", "suspended"].includes(user?.accountStatus)
            ? [user.accountStatus === "frozen" ? "unfreeze" : "restore_account"]
            : ["freeze", "suspend"]),
        ];
  const listingActions = (listing) => [
    ...(listing.moderationStatus !== "hidden" ? ["hide"] : []),
    ...(listing.moderationStatus !== "removed" ? ["remove"] : []),
    ...(listing.moderationStatus !== "under_review" ? ["under_review"] : []),
    ...(["hidden", "removed", "under_review"].includes(listing.moderationStatus)
      ? ["restore_listing"]
      : []),
  ];
  const profile = (user) => (
    <div className="admin-person">
      <ProfileAvatar
        profilePic={user?.profilePic}
        alt=""
        className="admin-avatar"
      />
      <div>
        <Person user={user} />
        <p>
          {user?.username && `@${user.username} · `}
          {user?.email}
        </p>
        <Status
          value={
            user?.accountStatus ||
            (user?.restriction?.status === "frozen" &&
            new Date(user.restriction.until) <= new Date()
              ? "active"
              : user?.restriction?.status)
          }
        />
        <small>Joined {date(user?.createdAt)}</small>
      </div>
    </div>
  );
  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar${open ? " is-open" : ""}`}>
        <Link className="admin-brand" to="/">
          <img src="/unimarket-icon.svg" alt="UniMarket" />
          UniMarket
        </Link>
        <p>MODERATION WORKSPACE</p>
        <nav aria-label="Admin navigation">
          {sections.map(([key, label]) => (
            <NavLink end={!key} key={key} to={`/admin${key ? `/${key}` : ""}`}>
              {label}
            </NavLink>
          ))}
        </nav>
        <Link className="admin-back" to="/">
          <ArrowLeft size={16} /> Back to marketplace
        </Link>
      </aside>
      <main className="admin-main">
        <header className="admin-header">
          <div>
            <span className="admin-eyebrow">UniMarket · Trust & safety</span>
            <h1>{title}</h1>
          </div>
          <div className="admin-header-actions">
            <button onClick={refresh} aria-label="Refresh dashboard">
              <RefreshCw size={18} />
            </button>
            <button
              className="admin-menu-button"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              <Menu size={20} />
              {open ? "Close menu" : "Menu"}
            </button>
          </div>
        </header>
        {!detailId && section && section !== "settings" && (
          <Filters section={section} params={params} setParams={setParams} />
        )}
        {loading ? (
          <p role="status" className="admin-empty">
            Loading moderation records…
          </p>
        ) : error ? (
          <div className="admin-error" role="alert">
            <p>{error}</p>
            <button onClick={refresh}>Try again</button>
          </div>
        ) : (
          data && (
            <>
              {!section && (
                <>
                  <div className="admin-stats">
                    {Object.entries(data.stats).map(([key, value]) => (
                      <article key={key}>
                        <span>
                          {
                            {
                              totalUsers: "Total users",
                              activeUsers: "Active users",
                              frozenUsers: "Frozen users",
                              suspendedUsers: "Suspended users",
                              pendingReports: "Unresolved reports",
                              resolvedReports: "Resolved reports",
                              reportedListings: "Reported listings",
                              warnings: "Warnings · last 30 days",
                            }[key]
                          }
                        </span>
                        <strong>{value.toLocaleString()}</strong>
                      </article>
                    ))}
                  </div>
                  <section className="admin-panel">
                    <h2>Recent reports</h2>
                    <ReportsTable rows={data.recentReports} />
                  </section>
                  <section className="admin-panel">
                    <h2>Recent moderation actions</h2>
                    <History rows={data.recentActions} />
                  </section>
                </>
              )}
              {["reports", "chat-reports"].includes(section) && !detailId && (
                <section className="admin-panel">
                  <ReportsTable rows={data.rows} />
                </section>
              )}
              {section === "reports" && detailId && (
                <>
                  <Link to="/admin/reports">← All reports</Link>
                  <section className="admin-panel">
                    <h2>{data.report.reason}</h2>
                    <Status value={data.report.status} />
                    <p className="admin-preserve">
                      {data.report.description ||
                        "No additional details supplied."}
                    </p>
                    <small>
                      Report {data.report._id} · {date(data.report.createdAt)}
                    </small>
                    {data.report.adminNote && (
                      <p>Internal note: {data.report.adminNote}</p>
                    )}
                    {!["resolved", "dismissed"].includes(
                      data.report.status
                    ) && (
                      <ActionButtons
                        actions={[
                          "review_report",
                          "resolve_report",
                          "dismiss_report",
                        ]}
                        targetId={data.report._id}
                        choose={setAction}
                      />
                    )}
                  </section>
                  <div className="admin-two-columns">
                    <section className="admin-panel">
                      <h2>Reporter</h2>
                      {profile(data.report.reporterId)}
                    </section>
                    <section className="admin-panel">
                      <h2>Reported user</h2>
                      {profile(data.report.reportedId)}
                      <p>
                        {data.userStats.reportsReceived} reports ·{" "}
                        {data.userStats.warnings} warnings ·{" "}
                        {data.userStats.listings} listings
                      </p>
                      <ActionButtons
                        actions={actionsFor(data.report.reportedId)}
                        targetId={data.report.reportedId?._id}
                        targetName={name(data.report.reportedId)}
                        choose={setAction}
                      />
                    </section>
                  </div>
                  {data.listing && (
                    <section className="admin-panel">
                      <h2>Reported listing · {data.listing.title}</h2>
                      <div className="admin-listing-images">
                        {data.listing.images.map((image) => (
                          <img
                            key={image.url}
                            src={image.url}
                            alt={data.listing.title}
                          />
                        ))}
                      </div>
                      <p>
                        ฿{data.listing.price.toLocaleString()} ·{" "}
                        {data.listing.category ||
                          data.listing.accommodationType}{" "}
                        · {date(data.listing.createdAt)}
                      </p>
                      <Status value={data.listing.moderationStatus} />
                      <p className="admin-preserve">
                        {data.listing.description}
                      </p>
                      <ActionButtons
                        actions={listingActions(data.listing)}
                        targetId={data.listing._id}
                        listingType={data.report.targetKind}
                        targetName={data.listing.title}
                        choose={setAction}
                      />
                    </section>
                  )}
                  {data.report.conversationId && (
                    <section className="admin-panel">
                      <h2>Relevant conversation context</h2>
                      <p>
                        Up to 12 messages from this reported conversation, at or
                        before the reported message or report date.
                      </p>
                      {data.context.length ? (
                        data.context.map((message) => (
                          <article
                            className="admin-chat-context"
                            key={message._id}
                          >
                            <strong>
                              {String(message.senderId) ===
                              String(data.report.reporterId?._id)
                                ? name(data.report.reporterId)
                                : name(data.report.reportedId)}
                            </strong>
                            <small>
                              {date(message.createdAt)}
                              {message._id === data.report.reportedMessageId &&
                                " · Reported message"}
                            </small>
                            <p className="admin-preserve">{message.text}</p>
                            {message.image && (
                              <img
                                src={message.image}
                                alt="Reported conversation attachment"
                              />
                            )}
                          </article>
                        ))
                      ) : (
                        <p>Messages are no longer available.</p>
                      )}
                    </section>
                  )}
                  <section className="admin-panel">
                    <h2>Recent moderation history</h2>
                    <History rows={data.history} />
                  </section>
                </>
              )}
              {["users", "restricted"].includes(section) && !detailId && (
                <section className="admin-panel admin-table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Joined</th>
                        <th>Profile</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((user) => (
                        <tr key={user._id}>
                          <td>
                            <Person user={user} />
                          </td>
                          <td>{user.email}</td>
                          <td>
                            <Status value={user.accountStatus} />
                            {user.accountStatus === "frozen" && (
                              <small>
                                Until {date(user.restriction.until)}
                              </small>
                            )}
                          </td>
                          <td>{date(user.createdAt)}</td>
                          <td>
                            <Link to={`/admin/users/${user._id}`}>
                              Review user
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!data.rows.length && (
                    <p className="admin-empty">No users match these filters.</p>
                  )}
                </section>
              )}
              {section === "users" && detailId && (
                <>
                  <section className="admin-panel">
                    {profile(data.user)}
                    {data.user.restriction?.reason && (
                      <p>
                        {data.user.restriction.reason}
                        {data.user.accountStatus === "frozen" && (
                          <> · Until {date(data.user.restriction.until)}</>
                        )}
                      </p>
                    )}
                    <ActionButtons
                      actions={actionsFor(data.user)}
                      targetId={data.user._id}
                      targetName={name(data.user)}
                      choose={setAction}
                    />
                    <div className="admin-actions">
                      <Link to={`/admin/listings?user=${data.user._id}`}>
                        View listings
                      </Link>
                      <Link to={`/admin/reports?user=${data.user._id}`}>
                        View reports
                      </Link>
                    </div>
                  </section>
                  <div className="admin-stats">
                    {Object.entries(data.stats).map(([key, value]) => (
                      <article key={key}>
                        <span>
                          {
                            {
                              activeItems: "Active item listings",
                              soldItems: "Sold items",
                              accommodations: "Accommodation listings",
                              received: "Reports received",
                              submitted: "Reports submitted",
                            }[key]
                          }
                        </span>
                        <strong>{value}</strong>
                      </article>
                    ))}
                  </div>
                  {[
                    ["Warnings", data.warnings, "warnings"],
                    ["Account restrictions", data.restrictions, "restrictions"],
                    ["Moderation history", data.history, "activity"],
                  ].map(([heading, rows, path]) => (
                    <section className="admin-panel" key={heading}>
                      <h2>{heading}</h2>
                      <History rows={rows} />
                      <Link to={`/admin/${path}?user=${data.user._id}`}>
                        View full history
                      </Link>
                    </section>
                  ))}
                </>
              )}
              {section === "listings" && (
                <section className="admin-panel admin-table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Listing</th>
                        <th>Seller</th>
                        <th>Price / category</th>
                        <th>Status</th>
                        <th>Reports</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((listing) => (
                        <tr key={listing._id}>
                          <td>
                            <div className="admin-listing-cell">
                              <img src={listing.images?.[0]?.url} alt="" />
                              <div>
                                <strong>{listing.title}</strong>
                                <small>{date(listing.createdAt)}</small>
                                <details>
                                  <summary>View details</summary>
                                  <p className="admin-preserve">
                                    {listing.description}
                                  </p>
                                  <code>{listing._id}</code>
                                </details>
                              </div>
                            </div>
                          </td>
                          <td>
                            <Person user={listing.user} />
                          </td>
                          <td>
                            ฿{listing.price.toLocaleString()}
                            <small>
                              {listing.category || listing.accommodationType}
                            </small>
                          </td>
                          <td>
                            <Status value={listing.moderationStatus} />
                            <small>
                              {listing.status === "sold" ? "Sold" : "Available"}
                            </small>
                          </td>
                          <td>
                            <Link to={`/admin/reports?listing=${listing._id}`}>
                              {listing.reportCount} reports
                            </Link>
                          </td>
                          <td>
                            <ActionButtons
                              actions={listingActions(listing)}
                              targetId={listing._id}
                              listingType={listing.kind}
                              targetName={listing.title}
                              choose={setAction}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!data.rows.length && (
                    <p className="admin-empty">
                      No listings match these filters.
                    </p>
                  )}
                </section>
              )}
              {["warnings", "restrictions", "activity"].includes(section) && (
                <section className="admin-panel">
                  <History rows={data.rows} />
                </section>
              )}
              {section === "settings" && (
                <section className="admin-panel">
                  <h2>Moderation settings</h2>
                  <p>{data.adminAssignment}</p>
                  <p>{data.privacy}</p>
                  <p>Report limit: {data.reportLimit}</p>
                </section>
              )}
              {data.pages !== undefined && (
                <div className="admin-pagination">
                  <span>
                    {data.total} records · Page {data.page} of{" "}
                    {Math.max(1, data.pages)}
                  </span>
                  <button
                    disabled={data.page <= 1}
                    onClick={() => {
                      const next = new URLSearchParams(params);
                      next.set("page", data.page - 1);
                      setParams(next);
                    }}
                  >
                    Previous
                  </button>
                  <button
                    disabled={data.page >= data.pages}
                    onClick={() => {
                      const next = new URLSearchParams(params);
                      next.set("page", data.page + 1);
                      setParams(next);
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )
        )}
      </main>
      {action && (
        <ModerationDialog
          action={action}
          onClose={() => setAction(null)}
          onDone={refresh}
        />
      )}
    </div>
  );
}
