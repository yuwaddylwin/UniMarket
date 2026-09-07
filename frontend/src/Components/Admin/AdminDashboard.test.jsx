import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AdminDashboard from './AdminDashboard';
let mockUser, mockPath;
const mockGet = jest.fn(), mockPost = jest.fn(), mockNavigate = jest.fn();
jest.mock('../lib/axios', () => ({ axiosInstance: { get: (...args) => mockGet(...args), post: (...args) => mockPost(...args) } }));
jest.mock('../store/useAuthStore', () => ({ useAuthStore: () => ({ authUser: mockUser }) }));
jest.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  NavLink: ({ children, to, end, ...props }) => <a href={to} {...props}>{children}</a>,
  Navigate: ({ to }) => <p>Redirect: {to}</p>,
  useLocation: () => ({ pathname: `/admin/${mockPath}` }),
  useNavigate: () => mockNavigate,
  useParams: () => ({ '*': mockPath }),
  useSearchParams: () => [new URLSearchParams(), jest.fn()],
}), { virtual: true });
jest.mock('react-hot-toast', () => ({ success: jest.fn() }));
beforeEach(() => {
  mockGet.mockReset(); mockPost.mockReset(); mockPath = '';
  mockUser = { _id: '111111111111111111111111', role: 'admin' };
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
test('regular users cannot load admin pages or start admin requests', () => {
  mockUser.role = 'user'; render(<AdminDashboard />);
  expect(screen.getByRole('heading', { name: 'Administrator access required' })).toBeInTheDocument();
  expect(mockGet).not.toHaveBeenCalled();
});
test('logged out visitors are redirected to normal authentication', () => {
  mockUser = null; render(<AdminDashboard />); expect(screen.getByText('Redirect: /login')).toBeInTheDocument(); expect(mockGet).not.toHaveBeenCalled();
});
test('freeze requires an explicit confirmation and reason, and uses a future end time', async () => {
  mockPath = 'users/222222222222222222222222';
  mockGet.mockResolvedValue({ data: { user: { _id: '222222222222222222222222', fullName: 'Alex', accountStatus: 'active', role: 'user' }, stats: {}, warnings: [], restrictions: [], history: [] } });
  mockPost.mockResolvedValue({ data: {} }); render(<AdminDashboard />);
  fireEvent.click(await screen.findByRole('button', { name: 'Freeze account' }));
  expect(mockPost).not.toHaveBeenCalled(); const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByRole('button', { name: 'Freeze account' })).toBeDisabled();
  fireEvent.change(within(dialog).getByLabelText('Reason (required)'), { target: { value: 'Confirmed harassment' } });
  fireEvent.change(within(dialog).getByLabelText('Freeze duration'), { target: { value: '3' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Freeze account' }));
  await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
  const body = mockPost.mock.calls[0][1]; expect(body.action).toBe('freeze'); expect(body.reason).toBe('Confirmed harassment'); expect(new Date(body.until).getTime() - Date.now()).toBeGreaterThan(2.9 * 86400000);
});
test('API failures display a retry action without leaving stale moderation records', async () => {
  mockGet.mockRejectedValue({ response: { data: { message: 'Unable to load records' } } }); render(<AdminDashboard />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load records'); expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
});
