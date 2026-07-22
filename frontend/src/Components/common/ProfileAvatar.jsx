const API_ORIGIN =
  process.env.NODE_ENV === "production"
    ? "https://unimarket-08di.onrender.com"
    : "http://localhost:8000";

export const DEFAULT_AVATAR = "/Images/default-avatar.svg";

export function getProfileImageSrc(profilePic) {
  if (!profilePic || typeof profilePic !== "string") return DEFAULT_AVATAR;
  return profilePic.startsWith("/uploads/")
    ? `${API_ORIGIN}${profilePic}`
    : profilePic;
}

export default function ProfileAvatar({ profilePic, alt = "Profile", ...props }) {
  return (
    <img
      {...props}
      src={getProfileImageSrc(profilePic)}
      alt={alt}
      onError={(event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.src = DEFAULT_AVATAR;
      }}
    />
  );
}
