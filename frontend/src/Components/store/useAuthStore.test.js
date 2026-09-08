import { useAuthStore } from './useAuthStore';
import { axiosInstance, removeAuthToken } from '../lib/axios';
jest.mock('../lib/axios', () => ({ axiosInstance: { get: jest.fn(), post: jest.fn() }, removeAuthToken: jest.fn(), getAuthToken: jest.fn() }));
jest.mock('socket.io-client', () => ({ io: jest.fn() }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
const disconnectSocket = jest.fn(), connectSocket = jest.fn();
beforeEach(() => { jest.clearAllMocks(); useAuthStore.setState({ authUser: null, disconnectSocket, connectSocket }); });
test('cookie sessions restore without a localStorage token', async () => {
  const user = { _id: 'cookie-user', username: 'cookie_user' }; axiosInstance.get.mockResolvedValue({ data: user });
  await useAuthStore.getState().checkAuth();
  expect(axiosInstance.get).toHaveBeenCalledWith('/auth/check', { timeout: 10000 }); expect(useAuthStore.getState().authUser).toEqual(user); expect(connectSocket).toHaveBeenCalled();
});
test('login clears legacy storage and replaces the previous account socket', async () => {
  const user = { _id: 'new-account', username: 'new_account' }; axiosInstance.post.mockResolvedValue({ data: user });
  await useAuthStore.getState().login({ identifier: 'new_account', password: 'password' });
  expect(removeAuthToken).toHaveBeenCalled(); expect(disconnectSocket).toHaveBeenCalled(); expect(connectSocket).toHaveBeenCalled(); expect(useAuthStore.getState().authUser).toEqual(user);
});
test('expired authentication disconnects its socket', async () => {
  useAuthStore.setState({ authUser: { _id: 'expired' } }); axiosInstance.get.mockRejectedValue({ response: { status: 401 } });
  await useAuthStore.getState().checkAuth(); expect(disconnectSocket).toHaveBeenCalled(); expect(useAuthStore.getState().authUser).toBeNull();
});
