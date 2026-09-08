import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import GoogleCompletePage from './GoogleCompletePage';
import { axiosInstance, removeAuthToken } from '../Components/lib/axios';
import { useAuthStore } from '../Components/store/useAuthStore';
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ Link: ({ children, to }) => <a href={to}>{children}</a>, useNavigate: () => mockNavigate }), { virtual: true });
jest.mock('../Components/lib/axios', () => ({ axiosInstance: { get: jest.fn(), post: jest.fn() }, removeAuthToken: jest.fn() }));
jest.mock('../Components/store/useAuthStore', () => ({ useAuthStore: { getState: jest.fn() } }));
const checkAuth = jest.fn();
let authUser;
beforeEach(() => { jest.clearAllMocks(); authUser = null; useAuthStore.getState.mockImplementation(() => ({ checkAuth, authUser })); checkAuth.mockResolvedValue(undefined); });
test('existing Google session restores and leaves the completion route', async () => {
  axiosInstance.get.mockRejectedValue({ response: { status: 401 } }); checkAuth.mockImplementation(async () => { authUser = { _id: 'google-user' }; });
  render(<GoogleCompletePage />); expect(screen.getByRole('status')).toHaveTextContent('Finishing Google sign-in');
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/profile', { replace: true }));
  expect(removeAuthToken).toHaveBeenCalled();
});
test('missing or blocked cookies produce actionable feedback', async () => {
  axiosInstance.get.mockRejectedValue({ response: { status: 401 } }); render(<GoogleCompletePage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Make sure cookies are allowed'); expect(mockNavigate).not.toHaveBeenCalled();
});
test('network failures render an error without being mistaken for a missing session', async () => {
  axiosInstance.get.mockRejectedValue(new Error('Network Error')); render(<GoogleCompletePage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach UniMarket'); expect(checkAuth).not.toHaveBeenCalled();
});
test('new users see username selection and cannot navigate with a failed session restore', async () => {
  axiosInstance.get.mockResolvedValue({ data: { email: 'new@example.test', needsUsername: true, needsCode: false } });
  axiosInstance.post.mockResolvedValue({ data: { _id: 'new-user' } }); render(<GoogleCompletePage />);
  fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'new_user' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm username and continue' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('could not restore your session'); expect(mockNavigate).not.toHaveBeenCalled();
});
