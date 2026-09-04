import { useEffect, useRef, useState } from "react";
import { Camera, Check, LogIn, Pencil, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import ItemCarousel from "../../Items/ItemStyle/ItemCarousel";
import { axiosInstance } from "../../lib/axios";
import ProfileAvatar from "../../common/ProfileAvatar";
import LoadingSpinner from "../../common/LoadingSpinner";
import "./ProfilePage.css";

const MAX_PROFILE_PHOTO_SIZE = 5 * 1024 * 1024;
const ACCEPTED_PROFILE_PHOTO_TYPES = new Set([
  "image/avif", "image/gif", "image/jpeg", "image/png", "image/webp",
]);

export default function ProfilePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { authUser, updateProfile, isUpdatingProfile } = useAuthStore();
  const [myListings, setMyListings] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [itemsError, setItemsError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [pendingPhoto, setPendingPhoto] = useState("");
  const authUserId = authUser?._id || authUser?.id;
  const authFullName = authUser?.fullName || "";
  const authProfilePic = authUser?.profilePic || "";

  useEffect(() => {
    if (!authUser) {
      setMyListings([]);
      setLoadingItems(false);
      setItemsError("");
      setPhotoError("");
      setPendingPhoto("");
    }
  }, [authUser]);

  useEffect(() => {
    if (!authUserId) return undefined;
    const controller = new AbortController();

    const fetchMyListings = async () => {
      try {
        setLoadingItems(true);
        setItemsError("");
        const [itemsResponse, accommodationsResponse] = await Promise.all([
          axiosInstance.get("/items/mine", { signal: controller.signal }),
          axiosInstance.get("/accommodations/mine", { signal: controller.signal }),
        ]);
        const items = Array.isArray(itemsResponse.data)
          ? itemsResponse.data : itemsResponse.data?.items || [];
        const accommodations = Array.isArray(accommodationsResponse.data)
          ? accommodationsResponse.data : accommodationsResponse.data?.accommodations || [];
        const listings = [
          ...items.map((item) => ({ ...item, listingType: "item" })),
          ...accommodations.map((listing) => ({ ...listing, listingType: "accommodation" })),
        ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        if (!controller.signal.aborted) setMyListings(listings);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Fetch my listings error:", error);
        setItemsError(error?.response?.data?.message || "Unable to load your listings. Please try again.");
      } finally {
        if (!controller.signal.aborted) setLoadingItems(false);
      }
    };

    fetchMyListings();
    return () => controller.abort();
  }, [authUserId]);

  // Make the new photo visible in this user's listing cards without a refresh.
  useEffect(() => {
    if (!authUserId) return;
    setMyListings((listings) => listings.map((listing) => ({
      ...listing,
      user: listing.user && typeof listing.user === "object"
        ? { ...listing.user, fullName: authFullName, profilePic: authProfilePic }
        : listing.user,
      seller: {
        ...(listing.seller || {}),
        id: listing.seller?.id || authUserId,
        fullName: authFullName,
        profilePic: authProfilePic,
      },
    })));
  }, [authUserId, authFullName, authProfilePic]);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ACCEPTED_PROFILE_PHOTO_TYPES.has(file.type)) {
      setPhotoError("Choose an AVIF, GIF, JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_PROFILE_PHOTO_SIZE) {
      setPhotoError("Profile photos must be 5 MB or smaller.");
      return;
    }

    setPhotoError("");
    const reader = new FileReader();
    reader.onerror = () => setPhotoError("Unable to read that image. Please try another file.");
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setPendingPhoto(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhoto = async () => {
    if (!pendingPhoto || isUpdatingProfile) return;
    try {
      setPhotoError("");
      await updateProfile({ profilePic: pendingPhoto });
      setPendingPhoto("");
    } catch (error) {
      setPhotoError(error?.response?.data?.message || "Unable to update your profile photo.");
    }
  };

  const cancelPhotoSelection = () => {
    setPendingPhoto("");
    setPhotoError("");
  };

  if (!authUser) {
    return (
      <main className="profile-page">
        <section className="profile-hero profile-hero--guest">
          <ProfileAvatar alt="Profile" className="profile-photo" />
          <div className="profile-identity">
            <span className="profile-eyebrow">Your account</span>
            <h1>Welcome to UniMarket</h1>
            <p>Log in to manage your profile and marketplace listings.</p>
          </div>
          <button className="profile-primary-action" type="button" onClick={() => navigate("/login")}>
            <LogIn aria-hidden="true" /> Log In
          </button>
        </section>
        <section className="profile-listings-panel">
          <div className="profile-section-heading"><div><h2>Your listings</h2></div></div>
          <div className="profile-empty-state"><p>Please log in to see and manage your listings.</p></div>
        </section>
      </main>
    );
  }

  const profileName = authUser.username ? `@${authUser.username}` : authUser.fullName;
  const itemCount = myListings.filter((listing) => listing.listingType === "item").length;
  const accommodationCount = myListings.filter((listing) => listing.listingType === "accommodation").length;
  return (
    <main className="profile-page">
      <section className="profile-hero profile-hero--member" aria-labelledby="profile-title">
        <div className="photo-wrapper">
          <ProfileAvatar profilePic={pendingPhoto || authUser.profilePic} alt={authUser.fullName || "Profile"} className="profile-photo" />
          <button
            className="profile-photo-edit"
            type="button"
            aria-label="Edit profile photo"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUpdatingProfile}
          >
            <Camera aria-hidden="true" /><span>Edit</span>
          </button>
          <input
            ref={fileInputRef}
            className="profile-photo-input"
            type="file"
            accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
            onChange={handlePhotoChange}
            tabIndex={-1}
          />
        </div>
        <div className="profile-identity">
          <h1 id="profile-title">{profileName}</h1>
          {authUser.username && <p>{authUser.fullName}</p>}
        </div>

        <dl className="profile-stats" aria-label="Profile listing summary">
          <div><dt>Listings</dt><dd>{myListings.length}</dd></div>
          <div><dt>Items</dt><dd>{itemCount}</dd></div>
          <div><dt>Accommodation</dt><dd>{accommodationCount}</dd></div>
        </dl>

        {photoError && <p className="profile-photo-error" role="alert">{photoError}</p>}
        {pendingPhoto && (
          <div className="profile-photo-actions" aria-label="Save selected profile photo">
            <button className="profile-save-photo" type="button" onClick={handleSavePhoto} disabled={isUpdatingProfile}>
              <Check aria-hidden="true" /> {isUpdatingProfile ? "Saving…" : "Save photo"}
            </button>
            <button className="profile-cancel-photo" type="button" onClick={cancelPhotoSelection} disabled={isUpdatingProfile}>
              <X aria-hidden="true" /> Cancel
            </button>
          </div>
        )}
        <button className="profile-secondary-action" type="button" onClick={() => navigate("/profile/settings")}>
          <Pencil aria-hidden="true" /> Edit profile
        </button>
      </section>

      <section className="profile-listings-panel">
        <div className="profile-section-heading">
          <div><h2>Your listings</h2></div>
        </div>
        {loadingItems ? (
          <LoadingSpinner className="profile-items-loading" label="Loading your listings…" />
        ) : itemsError ? (
          <p className="profile-items-error" role="alert">{itemsError}</p>
        ) : myListings.length === 0 ? (
          <div className="profile-empty-state"><strong>No listings yet</strong><p>Your items and accommodation posts will appear here.</p></div>
        ) : (
          <ItemCarousel
            items={myListings}
            onItemsChange={(listingId) => setMyListings((listings) =>
              listings.filter((listing) => String(listing._id || listing.id) !== String(listingId))
            )}
          />
        )}
      </section>
    </main>
  );
}
