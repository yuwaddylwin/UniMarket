import { resolveApiAssetUrl } from "../../config/api";

export const DEFAULT_AVATAR = "/Images/no-pfp.jpg"; // Default avatar image path

export function getProfileImageSrc(profilePic) {
  if (!profilePic || typeof profilePic !== "string") return DEFAULT_AVATAR;
  return resolveApiAssetUrl(profilePic, DEFAULT_AVATAR);
}

export default function ProfileAvatar({
  profilePic,
  alt = "Profile",
  ...props
}) {
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
