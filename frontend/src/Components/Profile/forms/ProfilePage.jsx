import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { Camera, LogOut, LogIn } from "lucide-react";
import ItemCarousel from "../../Items/ItemStyle/ItemCarousel";
import { useNavigate } from "react-router-dom";
import "./ProfilePage.css";
import { axiosInstance } from "../../lib/axios";
import ProfileAvatar from "../../common/ProfileAvatar";
import LoadingSpinner from "../../common/LoadingSpinner";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { authUser, updateProfile, logout, isUpdatingProfile } = useAuthStore();

  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // DB items
  const [myItems, setMyItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [itemsError, setItemsError] = useState("");

  // If logged out, clear everything (acts like a refresh)
  useEffect(() => {
    if (!authUser) {
      setSelectedFile(null);
      setPreview(null);
      setShowLogoutConfirm(false);
      setMyItems([]);
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

  useEffect(() => {
    const userId = authUser?._id || authUser?.id;
    if (!userId) return undefined;

    const controller = new AbortController();

    const fetchMyItems = async () => {
      try {
        setLoadingItems(true);
        setItemsError("");

        const res = await axiosInstance.get("/items/mine", {
          signal: controller.signal,
        });

        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        if (!controller.signal.aborted) setMyItems(list);
      } catch (err) {
        if (controller.signal.aborted) return;

        console.error("Fetch my items error:", err);
        setItemsError(
          err?.response?.data?.message ||
            "Unable to load your items. Please try again."
        );
      } finally {
        if (!controller.signal.aborted) setLoadingItems(false);
      }
    };

    fetchMyItems();
    return () => controller.abort();
  }, [authUser?._id, authUser?.id]);

  // Upload photo
  const handleUploadPhoto = async () => {
    if (!selectedFile) return;

    try {
      await updateProfile({ profilePic: preview });
      setSelectedFile(null);
    } catch (err) {
      console.error("Upload error:", err);
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
          <h2>Your Sell Items</h2>
          <p style={{ opacity: 0.7 }}>Please log in to see your items.</p>
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

          <label className="upload-btn">
            <Camera size={20} />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedFile(e.target.files[0])}
            />
          </label>
        </div>

        <p className="username">{authUser?.fullName}</p>

        {selectedFile && (
          <button
            onClick={handleUploadPhoto}
            disabled={isUpdatingProfile}
            className="save-photo-btn"
          >
            {isUpdatingProfile ? "Uploading..." : "Save Photo"}
          </button>
        )}
      </div>

      <section className="sell-items-section">
        <h2>Your Sell Items</h2>

        {loadingItems ? (
          <LoadingSpinner
            className="profile-items-loading"
            label="Loading your items…"
          />
        ) : itemsError ? (
          <p className="profile-items-error" role="alert">
            {itemsError}
          </p>
        ) : myItems.length === 0 ? (
          <p style={{ opacity: 0.7 }}>No items posted yet.</p>
        ) : (
          <ItemCarousel items={myItems} />
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
    </div>
  );
}
