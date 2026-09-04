import { axiosInstance } from "./Components/lib/axios.js";
import { useAuthStore } from "./Components/store/useAuthStore";

jest.mock("./Components/lib/axios.js", () => ({
  axiosInstance: {
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  setAuthToken: jest.fn(),
  removeAuthToken: jest.fn(),
  getAuthToken: jest.fn(),
}));

jest.mock("socket.io-client", () => ({ io: jest.fn() }));
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const userWithoutPhoto = { _id: "user-a", fullName: "User A", profilePic: "" };
const userWithPhoto = {
  ...userWithoutPhoto,
  profilePic: "https://res.cloudinary.com/example/image/upload/profile_pictures/user-a.jpg",
};

beforeEach(() => {
  axiosInstance.post.mockReset();
  axiosInstance.patch.mockReset();
  axiosInstance.delete.mockReset();
  useAuthStore.setState({
    authUser: userWithoutPhoto,
    isUpdatingProfile: false,
    isRemovingProfilePhoto: false,
    isUpdatingPreferences: false,
  });
});

test("updating account details immediately updates authenticated user state", async () => {
  const updatedUser = {
    ...userWithoutPhoto,
    fullName: "Updated User",
    username: "updated.user",
  };
  axiosInstance.patch.mockResolvedValue({ data: updatedUser });

  await useAuthStore.getState().updateAccount({
    fullName: "Updated User",
    username: "updated.user",
  });

  expect(axiosInstance.patch).toHaveBeenCalledWith("/auth/profile", {
    fullName: "Updated User",
  });
  expect(useAuthStore.getState().authUser).toEqual(updatedUser);
  expect(useAuthStore.getState().isUpdatingAccount).toBe(false);
});

test("persisting preferences immediately updates authenticated user state", async () => {
  const preferences = { language: "th", messages: false, notifications: true };
  const updatedUser = { ...userWithoutPhoto, preferences };
  axiosInstance.patch.mockResolvedValue({ data: updatedUser });

  await useAuthStore.getState().updatePreferences(preferences);

  expect(axiosInstance.patch).toHaveBeenCalledWith("/auth/preferences", preferences);
  expect(useAuthStore.getState().authUser).toEqual(updatedUser);
  expect(useAuthStore.getState().isUpdatingPreferences).toBe(false);
});

test("uploading a profile photo immediately updates authenticated user state", async () => {
  axiosInstance.post.mockResolvedValue({ data: userWithPhoto });

  await useAuthStore.getState().updateProfile({ profilePic: "data:image/png;base64,image" });

  expect(axiosInstance.post).toHaveBeenCalledWith("/auth/update-profile", {
    profilePic: "data:image/png;base64,image",
  });
  expect(useAuthStore.getState().authUser).toEqual(userWithPhoto);
});

test("removing a profile photo immediately restores empty persisted profile state", async () => {
  useAuthStore.setState({ authUser: userWithPhoto });
  axiosInstance.delete.mockResolvedValue({ data: userWithoutPhoto });

  await useAuthStore.getState().removeProfilePhoto();

  expect(axiosInstance.delete).toHaveBeenCalledWith("/auth/profile-photo");
  expect(useAuthStore.getState().authUser).toEqual(userWithoutPhoto);
});
