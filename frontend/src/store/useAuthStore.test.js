import { useAuthStore } from "./useAuthStore";
import { axiosInstance, removeAuthToken } from "../lib/axios";
jest.mock("../lib/axios", () => ({
  axiosInstance: { get: jest.fn(), post: jest.fn() },
  removeAuthToken: jest.fn(),
  getAuthToken: jest.fn(),
}));
jest.mock("./useSavedStore", () => ({
  useSavedStore: { getState: () => ({ setUser: jest.fn() }) },
}));
jest.mock("socket.io-client", () => ({ io: jest.fn() }));
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));
const disconnectSocket = jest.fn(),
  connectSocket = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.getState().invalidateAuthChecks();
  useAuthStore.setState({ authUser: null, disconnectSocket, connectSocket });
});
test("cookie sessions restore without a localStorage token", async () => {
  const user = { _id: "cookie-user", username: "cookie_user" };
  axiosInstance.get.mockResolvedValue({ data: user });
  await useAuthStore.getState().checkAuth();
  expect(axiosInstance.get).toHaveBeenCalledWith("/auth/check", {
    timeout: 20000,
  });
  expect(useAuthStore.getState().authUser).toEqual(user);
  expect(connectSocket).toHaveBeenCalled();
});
test("login clears legacy storage and replaces the previous account socket", async () => {
  const user = { _id: "new-account", username: "new_account" };
  axiosInstance.post.mockResolvedValue({ data: user });
  await useAuthStore
    .getState()
    .login({ identifier: "new_account", password: "password" });
  expect(removeAuthToken).toHaveBeenCalled();
  expect(disconnectSocket).toHaveBeenCalled();
  expect(connectSocket).toHaveBeenCalled();
  expect(useAuthStore.getState().authUser).toEqual(user);
});
test("expired authentication disconnects its socket", async () => {
  useAuthStore.setState({ authUser: { _id: "expired" } });
  axiosInstance.get.mockRejectedValue({ response: { status: 401 } });
  await useAuthStore.getState().checkAuth();
  expect(disconnectSocket).toHaveBeenCalled();
  expect(useAuthStore.getState().authUser).toBeNull();
});

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
test("concurrent session checks share a request", async () => {
  const task = deferred();
  axiosInstance.get.mockReturnValue(task.promise);
  const first = useAuthStore.getState().checkAuth(),
    second = useAuthStore.getState().checkAuth();
  expect(first).toBe(second);
  expect(axiosInstance.get).toHaveBeenCalledTimes(1);
  task.resolve({ data: { _id: "member" } });
  await first;
});
test("an old unauthorized check cannot overwrite a new login", async () => {
  const task = deferred();
  axiosInstance.get.mockReturnValue(task.promise);
  const first = useAuthStore.getState().checkAuth();
  axiosInstance.post.mockResolvedValue({ data: { _id: "new-user" } });
  await useAuthStore.getState().login({});
  task.reject({ response: { status: 401 } });
  await first;
  expect(useAuthStore.getState().authUser._id).toBe("new-user");
});
test("old session checks cannot overwrite session acceptance or logout state", async () => {
  const task = deferred();
  axiosInstance.get.mockReturnValue(task.promise);
  const first = useAuthStore.getState().checkAuth();
  useAuthStore.getState().acceptSession({ _id: "verified-user" });
  task.resolve({ data: { _id: "old-user" } });
  await first;
  expect(useAuthStore.getState().authUser._id).toBe("verified-user");
  const next = deferred();
  axiosInstance.get.mockReturnValue(next.promise);
  const check = useAuthStore.getState().checkAuth();
  await useAuthStore.getState().logout();
  next.resolve({ data: { _id: "verified-user" } });
  await check;
  expect(useAuthStore.getState().authUser).toBeNull();
});
test("temporary failures retry and retain the current user", async () => {
  useAuthStore.setState({ authUser: { _id: "member" } });
  axiosInstance.get.mockRejectedValue({ response: { status: 503 } });
  await useAuthStore.getState().checkAuth();
  expect(axiosInstance.get).toHaveBeenCalledTimes(2);
  expect(useAuthStore.getState().authUser._id).toBe("member");
  expect(useAuthStore.getState().authError).toMatch(/retry/);
});
test("HTML or malformed responses cannot become a session", async () => {
  axiosInstance.get.mockResolvedValue({ data: "<html>SPA</html>" });
  await useAuthStore.getState().checkAuth();
  expect(useAuthStore.getState().authUser).toBeNull();
  expect(useAuthStore.getState().authError).toBeTruthy();
});
