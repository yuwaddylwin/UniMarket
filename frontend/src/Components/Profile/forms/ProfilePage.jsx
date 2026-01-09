import { useEffect, useState } from "react";
import axios from "axios";
import { useAuthStore } from "../../store/useAuthStore";
import { Camera, LogOut } from "lucide-react";
import ItemCarousel from "../../Items/ItemStyle/ItemCarousel";
import "./ProfilePage.css";

export default function ProfilePage() {
  const { authUser, updateProfile, logout, isUpdatingProfile } = useAuthStore();

  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // DB items
  const [myItems, setMyItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [itemsError, setItemsError] = useState("");

  // Generate preview when a file is selected
  useEffect(() => {
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(selectedFile);
  }, [selectedFile]);

  // Fetch "my items" from DB
  const fetchMyItems = async () => {
    try {
      setLoadingItems(true);
      setItemsError("");

      const res = await axios.get("http://localhost:8000/api/items/mine", {
        withCredentials: true,
      });

      // backend returns array
      const list = Array.isArray(res.data) ? res.data : res.data?.items || [];

      setMyItems(list);
    } catch (err) {
      console.error("Fetch my items error:", err);
      setItemsError(err?.response?.data?.message || err.message || "Failed to load items");
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    // only fetch if logged in
    if (authUser?._id || authUser?.id) fetchMyItems();
  }, [authUser]);

  // Upload photo
  const handleUploadPhoto = async () => {
    if (!selectedFile) return;

    try {
      await updateProfile({ profilePic: preview });
      setSelectedFile(null);

      // optional: refresh items (if you store seller snapshot in each item and want updated picture)
      // fetchMyItems();
    } catch (err) {
      console.error("Upload error:", err);
    }
  };

  const handleLogoutClick = () => setShowLogoutConfirm(true);
  const handleCancelLogout = () => setShowLogoutConfirm(false);
  const handleConfirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
  };

  return (
    <div className="profile-container">
      <header className="profile-header">
        <h1 className="brand">Profile</h1>
      </header>

      <div className="photo-section">
        <div className="photo-wrapper">
          <img
            src={preview || authUser?.profilePic || "Images/user1.png"}
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

      {/* Sell items section (DB-backed) */}
      <section className="sell-items-section">
        <h2>Your Sell Items</h2>

        {loadingItems ? (
          <p style={{ opacity: 0.7 }}>Loading...</p>
        ) : itemsError ? (
          <p style={{ color: "crimson" }}>{itemsError}</p>
        ) : myItems.length === 0 ? (
          <p style={{ opacity: 0.7 }}>No items posted yet.</p>
        ) : (
          <ItemCarousel items={myItems} />
          // <div className="sell-items-grid">
          //   {myItems.map((it) => (
          //     <ItemCard key={it._id} item={it} />
          //   ))}
          // </div>
        )}
      </section>

      {/* Menu section */}
      <div className="menu-section">
        <button className="menu-btn">Purchase History</button>
        <button className="menu-btn">Language</button>

        <button className="menu-btn logout" onClick={handleLogoutClick}>
          <LogOut size={18} style={{ marginRight: "6px" }} />
          Log Out
        </button>
      </div>

      {/* Logout confirmation modal */}
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
