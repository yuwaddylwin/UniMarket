import {
  Building2,
  Home,
  MessageCircle,
  PackageSearch,
  Plus,
  Search,
  Settings,
  Bookmark,
  User,
} from "lucide-react";

export const primaryNavigationItems = [
  { id: "home", label: "Home", to: "/", icon: Home, mobile: true },
  { id: "chat", label: "Chat", to: "/chat", icon: MessageCircle, mobile: true, auth: true },
  { id: "post", label: "Post", to: "/post", icon: Plus, mobile: true, auth: true },
  { id: "search", label: "Search", to: "/search", icon: Search, mobile: true },
  { id: "profile", label: "Profile", to: "/profile", icon: User, mobile: true, auth: true },
  { id: "products", label: "Browse items", to: "/products", icon: PackageSearch },
  { id: "accommodations", label: "Accommodation", to: "/accommodations", icon: Building2 },
  { id: "saved", label: "Saved", to: "/saved", icon: Bookmark, auth: true },
  { id: "settings", label: "Settings", to: "/profile/settings", icon: Settings, auth: true },
];

export function getNavigationTarget(item, authUser) {
  return item.auth && !authUser ? "/login" : item.to;
}

export function isNavigationItemActive(item, pathname) {
  if (item.id === "home") return pathname === "/";
  if (item.id === "post") return pathname === "/post" || pathname === "/sell";
  return pathname.startsWith(item.to);
}
