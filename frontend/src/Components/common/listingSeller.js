export function normalizeSeller(it) {
  // The populated owner is authoritative so profile changes affect old listings.
  if (it?.user && typeof it.user === "object") {
    return {
      id: it.user._id || it.user.id || null,
      fullName:
        it.user.fullName ||
        it.user.name ||
        it.user.username ||
        it.user.email ||
        "",
      profilePic: it.user.profilePic || it.user.avatar || it.user.photo || "",
    };
  }

  // Legacy fallback for records whose owner can no longer be populated.
  if (it?.seller && typeof it.seller === "object") {
    return {
      id: it.seller.id || it.seller._id || it.seller.userId || null,
      fullName:
        it.seller.fullName || it.seller.name || it.seller.username || "",
      profilePic: it.seller.profilePic || it.seller.avatar || "",
    };
  }

  // If backend sends user as id string
  if (typeof it?.user === "string") {
    return { id: it.user, fullName: "", profilePic: "" };
  }

  return null;
}
