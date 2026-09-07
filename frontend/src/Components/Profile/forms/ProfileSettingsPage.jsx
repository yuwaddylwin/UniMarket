import SafetyDialog from "../../common/SafetyDialog";
import { useEffect, useState } from "react";
import { Archive, ChevronDown, Pencil, ShieldBan, UserRound } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { axiosInstance } from "../../lib/axios";
import LoadingSpinner from "../../common/LoadingSpinner";
import ProfileAvatar from "../../common/ProfileAvatar";
import ItemCarousel from "../../Items/ItemStyle/ItemCarousel";
import "./ProfileSettingsPage.css";

export default function ProfileSettingsPage() {
  const {
    authUser,
    updateAccount,
    isUpdatingAccount,
  } = useAuthStore();
  const [fullName, setFullName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [formError, setFormError] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archivedListings, setArchivedListings] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const [blockedError, setBlockedError] = useState("");
  const [confirmUnblock, setConfirmUnblock] = useState(null);
  const [unblockingId, setUnblockingId] = useState("");

  useEffect(() => {
    setFullName(authUser?.fullName || "");
    setFormError("");
  }, [authUser?._id, authUser?.fullName]);

  useEffect(() => {
    if (!archiveOpen) return undefined;
    const controller = new AbortController();
    const fetchArchive = async () => {
      try {
        setArchiveLoading(true);
        setArchiveError("");
        const [itemsResponse, accommodationsResponse] = await Promise.all([
          axiosInstance.get("/items/mine/archive", { signal: controller.signal }),
          axiosInstance.get("/accommodations/mine/archive", { signal: controller.signal }),
        ]);
        const items = Array.isArray(itemsResponse.data) ? itemsResponse.data : itemsResponse.data?.items || [];
        const accommodations = Array.isArray(accommodationsResponse.data)
          ? accommodationsResponse.data : accommodationsResponse.data?.accommodations || [];
        const archived = [
          ...items.map((item) => ({ ...item, listingType: "item" })),
          ...accommodations.map((listing) => ({ ...listing, listingType: "accommodation" })),
        ].sort((a, b) => new Date(b.soldAt || b.updatedAt || 0) - new Date(a.soldAt || a.updatedAt || 0));
        if (!controller.signal.aborted) setArchivedListings(archived);
      } catch (error) {
        if (controller.signal.aborted) return;
        setArchiveError(error?.response?.data?.message || "Unable to load your Archive.");
      } finally {
        if (!controller.signal.aborted) setArchiveLoading(false);
      }
    };
    fetchArchive();
    return () => controller.abort();
  }, [archiveOpen]);

  useEffect(() => {
    if (!blockedOpen) return undefined;
    const controller = new AbortController();
    const fetchBlockedUsers = async () => {
      try {
        setBlockedLoading(true);
        setBlockedError("");
        const response = await axiosInstance.get("/auth/blocked-users", {
          signal: controller.signal,
        });
        const users = Array.isArray(response.data) ? response.data : response.data?.users || [];
        if (!controller.signal.aborted) setBlockedUsers(users);
      } catch (error) {
        if (!controller.signal.aborted) {
          setBlockedError(error?.response?.data?.message || "Unable to load blocked accounts.");
        }
      } finally {
        if (!controller.signal.aborted) setBlockedLoading(false);
      }
    };
    fetchBlockedUsers();
    return () => controller.abort();
  }, [blockedOpen]);

  const saveName = async (event) => {
    event.preventDefault();
    const name = fullName.trim();
    if (!name) return setFormError("Name cannot be empty.");
    if (name.length < 2 || name.length > 80) return setFormError("Name must be between 2 and 80 characters.");
    try {
      setFormError("");
      await updateAccount({ fullName: name });
      setIsEditingName(false);
    } catch (error) {
      setFormError(error?.response?.data?.message || "Unable to update your name.");
    }
  };

  const unblockUser = async (userId) => {
    try {
      setUnblockingId(userId);
      setBlockedError("");
      await axiosInstance.delete(`/auth/blocked-users/${userId}`);
      setBlockedUsers((users) => users.filter((user) => String(user._id || user.id) !== String(userId)));
    } catch (error) {
      throw error;
    } finally {
      setUnblockingId("");
    }
  };

  return (
    <main className="profile-settings-page">
      {confirmUnblock && <SafetyDialog title="Unblock this user?" description="You can message each other again unless this user has also blocked you." confirmLabel="Unblock" onConfirm={() => unblockUser(confirmUnblock)} onClose={() => setConfirmUnblock(null)} />}
      <header className="profile-settings-header">
        <span>Account</span>
        <h1>Profile Settings</h1>
        <p>Manage how your account appears and behaves across UniMarket.</p>
      </header>

      <section className="settings-section" aria-labelledby="account-settings-title">
        <div className="settings-section-title"><UserRound aria-hidden="true" /><div><h2 id="account-settings-title">Profile</h2><p>Your public account information</p></div></div>

        <div className="settings-row settings-name-row">
          <div className="settings-row-copy"><strong>Name</strong><span>{authUser?.fullName}</span></div>
          {!isEditingName && <button className="settings-text-button" type="button" aria-label="Edit display name" onClick={() => setIsEditingName(true)}><Pencil aria-hidden="true" /> Edit</button>}
        </div>
        {isEditingName && (
          <form className="settings-name-form" onSubmit={saveName} noValidate>
            <label htmlFor="profile-full-name">Display name</label>
            <input id="profile-full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={80} autoComplete="name" />
            {formError && <p role="alert">{formError}</p>}
            <div><button type="button" onClick={() => { setFullName(authUser?.fullName || ""); setFormError(""); setIsEditingName(false); }} disabled={isUpdatingAccount}>Cancel</button><button type="submit" disabled={isUpdatingAccount || fullName.trim() === authUser?.fullName}>{isUpdatingAccount ? "Saving…" : "Save name"}</button></div>
          </form>
        )}

        <div className="settings-row">
          <div className="settings-row-copy"><strong>Username</strong><span>{authUser?.username ? `@${authUser.username}` : "Not set"}</span><small>Your username is permanent and cannot be changed.</small></div>
          <span className="settings-readonly">Read-only</span>
        </div>
      </section>

      <section className="settings-section settings-archive settings-blocked" aria-labelledby="blocked-title">
        <button className="archive-toggle" type="button" aria-expanded={blockedOpen} aria-controls="blocked-users" onClick={() => setBlockedOpen((open) => !open)}>
          <ShieldBan aria-hidden="true" /><span><strong id="blocked-title">Blocked</strong><small>Manage blocked accounts</small></span><ChevronDown className={blockedOpen ? "is-open" : ""} aria-hidden="true" />
        </button>
        {blockedOpen && <div id="blocked-users" className="archive-content blocked-content">
          {blockedLoading ? <LoadingSpinner className="archive-loading" label="Loading blocked accounts…" /> : blockedError ? <p className="archive-error" role="alert">{blockedError}</p> : blockedUsers.length === 0 ? <div className="archive-empty"><strong>No blocked accounts</strong><p>Accounts you block will appear here.</p></div> : <div className="blocked-list">
            {blockedUsers.map((user) => {
              const userId = user._id || user.id;
              return <div className="blocked-user" key={userId}>
                <ProfileAvatar className="blocked-user-avatar" profilePic={user.profilePic} alt={user.fullName || user.username || "Blocked user"} />
                <div><strong>{user.fullName || user.username || "User"}</strong>{user.username && <span>@{user.username}</span>}</div>
                <button type="button" onClick={() => setConfirmUnblock(userId)} disabled={unblockingId === userId}>{unblockingId === userId ? "Unblocking…" : "Unblock"}</button>
              </div>;
            })}
          </div>}
        </div>}
      </section>

      <section className="settings-section settings-archive" aria-labelledby="archive-title">
        <button className="archive-toggle" type="button" aria-expanded={archiveOpen} aria-controls="sold-listings" onClick={() => setArchiveOpen((open) => !open)}>
          <Archive aria-hidden="true" /><span><strong id="archive-title">Archive</strong><small>Sold listings</small></span><ChevronDown className={archiveOpen ? "is-open" : ""} aria-hidden="true" />
        </button>
        {archiveOpen && <div id="sold-listings" className="archive-content">
          {archiveLoading ? <LoadingSpinner className="archive-loading" label="Loading sold listings…" /> : archiveError ? <p className="archive-error" role="alert">{archiveError}</p> : archivedListings.length === 0 ? <div className="archive-empty"><strong>No sold listings</strong><p>Listings you mark as sold will be kept here.</p></div> : <ItemCarousel items={archivedListings} archiveMode onItemsChange={(listingId) => setArchivedListings((listings) => listings.filter((listing) => String(listing._id || listing.id) !== String(listingId)))} />}
        </div>}
      </section>
    </main>
  );
}
