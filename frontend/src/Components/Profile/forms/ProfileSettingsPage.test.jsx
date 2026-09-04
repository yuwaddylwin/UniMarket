import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProfileSettingsPage from "./ProfileSettingsPage";
import { axiosInstance } from "../../lib/axios";

const mockUpdateAccount = jest.fn();
const mockUpdatePreferences = jest.fn();
const mockNavigate = jest.fn();
let mockAuthUser;

jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }), { virtual: true });
jest.mock("../../lib/axios", () => ({ axiosInstance: { get: jest.fn(), patch: jest.fn(), delete: jest.fn() } }));
jest.mock("../../store/useAuthStore", () => ({
  useAuthStore: () => ({ authUser: mockAuthUser, updateAccount: mockUpdateAccount, updatePreferences: mockUpdatePreferences, isUpdatingAccount: false, isUpdatingPreferences: false }),
}));

beforeEach(() => {
  mockAuthUser = { _id: "user-a", fullName: "User A", username: "user.a", email: "user@example.com", profilePic: "", preferences: { language: "en", messages: true, notifications: true } };
  mockUpdateAccount.mockReset().mockResolvedValue(undefined);
  mockUpdatePreferences.mockReset().mockResolvedValue(undefined);
  mockNavigate.mockReset();
  axiosInstance.get.mockReset().mockResolvedValue({ data: [] });
  axiosInstance.patch.mockReset().mockResolvedValue({ data: {} });
  axiosInstance.delete.mockReset().mockResolvedValue({ data: {} });
});

test("shows profile settings with an immutable username", () => {
  render(<ProfileSettingsPage />);
  expect(screen.getByRole("heading", { name: "Profile Settings" })).toBeInTheDocument();
  expect(screen.getByText("@user.a")).toBeInTheDocument();
  expect(screen.getByText(/username is permanent/i)).toBeInTheDocument();
  expect(screen.queryByRole("textbox", { name: /username/i })).not.toBeInTheDocument();
  expect(screen.getByText("Read-only")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Edit profile photo" })).not.toBeInTheDocument();
});

test("edits and saves only the display name", async () => {
  render(<ProfileSettingsPage />);
  fireEvent.click(screen.getByRole("button", { name: "Edit display name" }));
  fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "  Updated User  " } });
  fireEvent.click(screen.getByRole("button", { name: "Save name" }));
  await waitFor(() => expect(mockUpdateAccount).toHaveBeenCalledWith({ fullName: "Updated User" }));
  expect(mockUpdateAccount.mock.calls[0][0]).not.toHaveProperty("username");
});

test("validates the display name before saving", () => {
  render(<ProfileSettingsPage />);
  fireEvent.click(screen.getByRole("button", { name: "Edit display name" }));
  fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Save name" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Name cannot be empty.");
  expect(mockUpdateAccount).not.toHaveBeenCalled();
});

test("hides language and saves independent notification preferences", async () => {
  render(<ProfileSettingsPage />);
  expect(screen.queryByText("Language")).not.toBeInTheDocument();
  expect(screen.queryByRole("radiogroup", { name: "Language" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("switch", { name: "Messages" }));
  await waitFor(() => expect(mockUpdatePreferences).toHaveBeenLastCalledWith({ language: "en", messages: false, notifications: true }));
  expect(screen.getByRole("switch", { name: "Notifications" })).toHaveAttribute("aria-checked", "true");
});

test("opens the sold archive and restores a listing", async () => {
  axiosInstance.get.mockImplementation((path) => Promise.resolve({ data: path.startsWith("/items") ? [{ _id: "sold-1", title: "Sold Book", price: 80, status: "sold", images: [] }] : [] }));
  render(<ProfileSettingsPage />);
  fireEvent.click(screen.getByRole("button", { name: /archive sold listings/i }));
  expect(await screen.findByText("Sold Book")).toBeInTheDocument();
  expect(screen.getByText("Sold · Archived")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Open actions for Sold Book" }));
  fireEvent.click(screen.getByRole("button", { name: "Restore listing" }));
  await waitFor(() => expect(axiosInstance.patch).toHaveBeenCalledWith("/items/sold-1/status", { status: "active" }));
  await waitFor(() => expect(screen.queryByText("Sold Book")).not.toBeInTheDocument());
});

test("opens blocked accounts and allows an account to be unblocked", async () => {
  axiosInstance.get.mockImplementation((path) => Promise.resolve({
    data: path === "/auth/blocked-users"
      ? [{ _id: "user-b", fullName: "Blocked User", username: "blocked.user", profilePic: "" }]
      : [],
  }));
  render(<ProfileSettingsPage />);

  fireEvent.click(screen.getByRole("button", { name: /blocked manage blocked accounts/i }));
  expect(await screen.findByText("Blocked User")).toBeInTheDocument();
  expect(screen.getByText("@blocked.user")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Unblock" }));

  await waitFor(() => expect(axiosInstance.delete).toHaveBeenCalledWith("/auth/blocked-users/user-b"));
  await waitFor(() => expect(screen.queryByText("Blocked User")).not.toBeInTheDocument());
  expect(screen.getByText("No blocked accounts")).toBeInTheDocument();
});
