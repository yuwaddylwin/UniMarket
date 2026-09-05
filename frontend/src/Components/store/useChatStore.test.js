import { useChatStore } from './useChatStore';
import { axiosInstance } from '../lib/axios';
jest.mock('../lib/axios', () => ({ axiosInstance: { get: jest.fn(), post: jest.fn() } }));
jest.mock('./useAuthStore', () => ({ useAuthStore: { getState: () => ({ authUser: { _id: 'me' } }) } }));
jest.mock('react-hot-toast', () => ({ error: jest.fn() }));
beforeEach(() => {
  jest.clearAllMocks();
  useChatStore.getState().setSelectedUser({ _id: 'partner' });
});
test.each([404, 500, undefined])('an availability failure (%s) does not block sending', async status => {
  axiosInstance.get.mockRejectedValue({ response: status ? { status } : undefined });
  await useChatStore.getState().getSafety('partner');
  expect(useChatStore.getState().messagingBlocked).toBe(false);
  expect(useChatStore.getState().safetyLoading).toBe(false);
  expect(useChatStore.getState().safetyError).toMatch(/Could not check/);
  axiosInstance.post.mockResolvedValue({ data: { _id: 'message', text: 'Hello' } });
  expect(await useChatStore.getState().sendMessage({ text: 'Hello' })).toBe(true);
  expect(axiosInstance.post).toHaveBeenCalledWith('/messages/send/partner', { text: 'Hello' });
});
test('a failed refresh becomes unknown instead of retaining stale blocked state', async () => {
  axiosInstance.get.mockResolvedValue({ data: { blockedByMe: false, messagingBlocked: true } });
  await useChatStore.getState().getSafety('partner');
  expect(useChatStore.getState().messagingBlocked).toBe(true);
  axiosInstance.get.mockRejectedValue(new Error('offline'));
  await useChatStore.getState().getSafety('partner');
  expect(useChatStore.getState().messagingBlocked).toBe(false);
});
test('successful retry clears the error and stale responses cannot overwrite current status', async () => {
  let resolveOld;
  axiosInstance.get.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
  const old = useChatStore.getState().getSafety('partner');
  axiosInstance.get.mockResolvedValue({ data: { blockedByMe: false, messagingBlocked: false } });
  await useChatStore.getState().getSafety('partner');
  resolveOld({ data: { blockedByMe: true, messagingBlocked: true } });
  await old;
  expect(useChatStore.getState().messagingBlocked).toBe(false);
  expect(useChatStore.getState().safetyError).toBe('');
});
test('malformed API data is an availability error, not a block', async () => {
  axiosInstance.get.mockResolvedValue({ data: '<html>Not found</html>' });
  await useChatStore.getState().getSafety('partner');
  expect(useChatStore.getState().messagingBlocked).toBe(false);
  expect(useChatStore.getState().safetyError).toMatch(/Could not check/);
});

test('opening another conversation or logging out clears cached blocks and pending responses', async () => {
  let resolve;
  axiosInstance.get.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const pending = useChatStore.getState().getSafety('partner');
  useChatStore.getState().setSelectedUser(null);
  useChatStore.getState().setSelectedUser({ _id: 'another-user' });
  resolve({ data: { blockedByMe: true, messagingBlocked: true } });
  await pending;
  expect(useChatStore.getState().messagingBlocked).toBe(false);
});
test('unblock response immediately clears a block without a second request', () => {
  useChatStore.setState({ blockedByMe: true, messagingBlocked: true });
  useChatStore.getState().applySafety('partner', { blockedByMe: false, messagingBlocked: false });
  expect(useChatStore.getState().messagingBlocked).toBe(false);
  expect(axiosInstance.get).not.toHaveBeenCalled();
});
