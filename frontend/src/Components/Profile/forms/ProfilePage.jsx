import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { Camera, LogOut, LogIn, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import ItemCarousel from "../../Items/ItemStyle/ItemCarousel";
import { useNavigate } from "react-router-dom";
import "./ProfilePage.css";
import { axiosInstance } from "../../lib/axios";
import ProfileAvatar from "../../common/ProfileAvatar";
import LoadingSpinner from "../../common/LoadingSpinner";

export default function ProfilePage() {
  const navigate = useNavigate();
  const {
    authUser,
    updateProfile,
    removeProfilePhoto,
    logout,
    isUpdatingProfile,
    isRemovingProfilePhoto,
  } = useAuthStore();

  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showRemovePhotoConfirm, setShowRemovePhotoConfirm] = useState(false);

  // Listings are kept in their own database collections and combined only for display.
  const [myListings, setMyListings] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [itemsError, setItemsError] = useState("");

  // If logged out, clear everything (acts like a refresh)
  useEffect(() => {
    if (!authUser) {
      setSelectedFile(null);
      setPreview(null);
      setShowLogoutConfirm(false);
      setShowRemovePhotoConfirm(false);
      setMyListings([]);
      setLoadingItems(false);
      setItemsError("");
    }
  }, [authUser]);

  // Generate preview when a file is selected
  useEffect(() => {
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(selectedFile);
  }, [selectedFile]);

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile picture must be 5 MB or smaller.");
      return;
    }
    setSelectedFile(file);
  };

  useEffect(() => {
    const userId = authUser?._id || authUser?.id;
    if (!userId) return undefined;

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
          ? itemsResponse.data
          : itemsResponse.data?.items || [];
        const accommodations = Array.isArray(accommodationsResponse.data)
          ? accommodationsResponse.data
          : accommodationsResponse.data?.accommodations || [];
        const listings = [
          ...items.map((item) => ({ ...item, listingType: "item" })),
          ...accommodations.map((listing) => ({
            ...listing,
            listingType: "accommodation",
          })),
        ].sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );

        if (!controller.signal.aborted) setMyListings(listings);
      } catch (err) {
        if (controller.signal.aborted) return;

        console.error("Fetch my items error:", err);
        setItemsError(
          err?.response?.data?.message ||
            "Unable to load your listings. Please try again."
        );
      } finally {
        if (!controller.signal.aborted) setLoadingItems(false);
      }
    };

    fetchMyListings();
    return () => controller.abort();
  }, [authUser?._id, authUser?.id]);

  // Upload photo
  const handleUploadPhoto = async () => {
    if (!selectedFile) return;

    try {
      await updateProfile({ profilePic: preview });
      setSelectedFile(null);
      setPreview(null);
    } catch (err) {
      console.error("Upload error:", err);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      await removeProfilePhoto();
      setSelectedFile(null);
      setPreview(null);
      setShowRemovePhotoConfirm(false);
    } catch (err) {
      console.error("Remove photo error:", err);
    }
  };

  const handleLogoutClick = () => setShowLogoutConfirm(true);
  const handleCancelLogout = () => setShowLogoutConfirm(false);

  const handleConfirmLogout = async () => {
    await logout();          
    setShowLogoutConfirm(false);
    navigate("/login");      
  };

  // LOGGED OUT VIEW (no data)
  if (!authUser) {
    return (
      <div className="profile-container">
        <header className="profile-header">
          <h1 className="brand">Profile</h1>
        </header>

        <div className="photo-section">
          <div className="photo-wrapper">
            <ProfileAvatar
              alt="profile"
              className="profile-photo"
            />
          </div>

          <p className="username">User</p>

          <button
            className="menu-btn logout"
            type="button"
            onClick={() => navigate("/login")}
          >
            <LogIn size={18} style={{ marginRight: "6px" }} />
            Log In
          </button>
        </div>

        <section className="sell-items-section">
          <h2>Your Listed Items</h2>
          <p style={{ opacity: 0.7 }}>Please log in to see your listings.</p>
        </section>
      </div>
    );
  }

  //  LOGGED IN VIEW 
  return (
    <div className="profile-container">
      <header className="profile-header">
        <h1 className="brand">Profile</h1>
      </header>

      <div className="photo-section">
        <div className="photo-wrapper">
          <ProfileAvatar
            profilePic={preview || authUser?.profilePic}
            alt="profile"
            className="profile-photo"
          />

        </div>

        <p className="username">{authUser?.fullName}</p>

        <div className="profile-photo-actions">
          <label className="change-photo-btn">
            <Camera size={17} aria-hidden="true" />
            {authUser?.profilePic ? "Change Photo" : "Upload Photo"}
            <input type="file" accept="image/*" onChange={handleFileSelect} />
          </label>

          {authUser?.profilePic && !selectedFile && (
            <button
              type="button"
              className="remove-photo-btn"
              onClick={() => setShowRemovePhotoConfirm(true)}
            >
              <Trash2 size={17} aria-hidden="true" />
              Remove Photo
            </button>
          )}
        </div>

        {selectedFile && <div className="profile-photo-save-actions">
          <button onClick={handleUploadPhoto} disabled={isUpdatingProfile || !preview} className="save-photo-btn">
            {isUpdatingProfile ? "Uploading..." : preview ? "Save Photo" : "Preparing..."}
          </button>
          <button
            type="button"
            className="cancel-photo-btn"
            disabled={isUpdatingProfile}
            onClick={() => { setSelectedFile(null); setPreview(null); }}
          >
            <X size={16} aria-hidden="true" /> Cancel
          </button>
        </div>}
      </div>

      <section className="sell-items-section">
        <h2>Your Listed Items</h2>

        {loadingItems ? (
          <LoadingSpinner
            className="profile-items-loading"
            label="Loading your items…"
          />
        ) : itemsError ? (
          <p className="profile-items-error" role="alert">
            {itemsError}
          </p>
        ) : myListings.length === 0 ? (
          <p style={{ opacity: 0.7 }}>No listings posted yet.</p>
        ) : (
          <ItemCarousel items={myListings} />
        )}
      </section>

      <div className="menu-section">
        {/* Upcoming Features */}
        {/* <button className="menu-btn">Purchase History</button>
        <button className="menu-btn">Language</button> */}

        <button className="menu-btn logout" onClick={handleLogoutClick}>
          <LogOut size={18} style={{ marginRight: "6px" }} />
          Log Out
        </button>
      </div>

      {showLogoutConfirm && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <p>Are you sure you want to log out?</p>

            <div className="confirm-buttons">
              <button className="cancel-btn" onClick={handleCancelLogout}>
                Cancel
              </button>
              <button className="yes-btn" onClick={handleConfirmLogout}>
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {showRemovePhotoConfirm && (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="remove-photo-title">
          <div className="confirm-box">
            <p id="remove-photo-title">Remove your profile photo?</p>
            <span className="confirm-description">Your default profile icon will be shown across UniMarket.</span>
            <div className="confirm-buttons">
              <button className="cancel-btn" type="button" onClick={() => setShowRemovePhotoConfirm(false)} disabled={isRemovingProfilePhoto}>
                Cancel
              </button>
              <button className="yes-btn" type="button" onClick={handleRemovePhoto} disabled={isRemovingProfilePhoto}>
                {isRemovingProfilePhoto ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
