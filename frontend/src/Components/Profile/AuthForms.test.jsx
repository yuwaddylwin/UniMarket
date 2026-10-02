import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LoginForm from "./LoginForm";
import SignUpForm from "./SignUpForm";
import AuthCodePage from "../../pages/AuthCodePage";
import { axiosInstance } from "../../lib/axios";
import { useAuthStore } from "../../store/useAuthStore";
const mockNavigate = jest.fn();
jest.mock(
  "react-router-dom",
  () => ({
    MemoryRouter: ({ children }) => children,
    Link: ({ children, to, ...props }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    useLocation: () => ({ search: "", state: {} }),
    useNavigate: () => mockNavigate,
  }),
  { virtual: true }
);
jest.mock("../../lib/axios", () => ({
  axiosInstance: { get: jest.fn(), post: jest.fn() },
  removeAuthToken: jest.fn(),
}));
jest.mock("../../store/useAuthStore", () => ({ useAuthStore: jest.fn() }));
const login = jest.fn(),
  signup = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.mockReturnValue({ login, signup });
  axiosInstance.get.mockResolvedValue({
    data: { available: true, message: "Username available" },
  });
});
const mount = (component) => render(<MemoryRouter>{component}</MemoryRouter>);
test("login accepts usernames without email-format validation and shows backend errors", async () => {
  login.mockRejectedValue({
    response: { data: { message: "Incorrect username/email or password." } },
  });
  mount(<LoginForm />);
  fireEvent.change(screen.getByLabelText("Username or email"), {
    target: { value: "my_username" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "wrong" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() =>
    expect(login).toHaveBeenCalledWith({
      identifier: "my_username",
      password: "wrong",
    })
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Incorrect username/email or password."
  );
  expect(
    screen.getByRole("link", { name: "Forgot password?" })
  ).toHaveAttribute("href", "/forgot-password");
});
test("signup distinguishes permanent username and checks password confirmation", async () => {
  mount(<SignUpForm />);
  expect(screen.getByText(/Your @username is permanent/)).toBeInTheDocument();
  for (const [label, value] of [
    ["Name", "Test User"],
    ["Username", "tester"],
    ["Email", "test@university.edu"],
    ["Password", "password123"],
    ["Confirm password", "different"],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  expect(await screen.findByText("Username available")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Passwords do not match."
  );
  expect(signup).not.toHaveBeenCalled();
});
test("OTP input supports numeric paste, resend and cooldown", async () => {
  axiosInstance.post.mockResolvedValue({ data: { message: "Code sent." } });
  mount(<AuthCodePage />);
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "test@example.test" },
  });
  fireEvent.change(screen.getByLabelText("6-digit code"), {
    target: { value: "123 456" },
  });
  expect(screen.getByLabelText("6-digit code")).toHaveValue("123456");
  fireEvent.click(screen.getByRole("button", { name: "Send / resend code" }));
  await waitFor(() =>
    expect(axiosInstance.post).toHaveBeenCalledWith(
      "/auth/resend-verification",
      { email: "test@example.test" }
    )
  );
  expect(
    await screen.findByRole("button", { name: /Resend in/ })
  ).toBeDisabled();
});

test("unverified login opens verification with the account email", async () => {
  login.mockRejectedValue({ response: { data: { code: "EMAIL_UNVERIFIED", email: "pending@example.test" } } });
  mount(<LoginForm />);
  fireEvent.change(screen.getByLabelText("Username or email"), { target: { value: "pending" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/verify-code", { state: { email: "pending@example.test", needsCode: true } }));
});

test.each([502, 503])("signup delivery failure %s opens recovery only with explicit delivery error", async (status) => {
  signup.mockRejectedValue({ response: { status, data: { code: "EMAIL_DELIVERY_FAILED" } } });
  mount(<SignUpForm />);
  for (const [label, value] of [["Name", "Test User"], ["Username", "tester"], ["Email", "test@example.test"], ["Password", "password123"], ["Confirm password", "password123"]])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/verify-code", { state: { email: "test@example.test", deliveryFailed: true } }));
});
