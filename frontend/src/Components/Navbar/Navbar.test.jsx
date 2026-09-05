import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Navbar from "./Navbar";

let mockAuthUser = null;
const mockLogout = jest.fn();
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  useLocation: () => ({ pathname: "/" }),
  useNavigate: () => mockNavigate,
}), { virtual: true });

jest.mock("../store/useAuthStore", () => ({
  useAuthStore: () => ({ authUser: mockAuthUser, logout: mockLogout }),
}));

function renderNavbar(authUser = null) {
  mockAuthUser = authUser;
  mockLogout.mockReset().mockResolvedValue(undefined);
  render(<Navbar />);
  fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
  return { logout: mockLogout };
}

test("home search opens the combined Search page with the entered query", () => {
  mockAuthUser = null;
  mockNavigate.mockReset();
  render(<Navbar />);

  const searchInput = screen.getByRole("searchbox", { name: "Search UniMarket" });
  fireEvent.change(searchInput, {
    target: { value: "study desk" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Search UniMarket" }));

  expect(mockNavigate).toHaveBeenCalledWith("/search?search=study%20desk");
  expect(searchInput).toHaveValue("");
});

test("profile settings and help routes are available from the menu", () => {
  renderNavbar();

  const profileSettingsLink = screen.getByRole("link", { name: "01 Profile Settings" });
  expect(profileSettingsLink).toHaveAttribute(
    "href",
    "/profile/settings"
  );
  expect(profileSettingsLink.querySelector("svg")).toBeNull();
  expect(screen.queryByRole("link", { name: "01 Profile" })).not.toBeInTheDocument();

  const helpToggle = screen.getByRole("button", { name: /help & support/i });
  expect(helpToggle).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("link", { name: "Privacy" })).not.toBeInTheDocument();

  fireEvent.click(helpToggle);
  expect(helpToggle).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("link", { name: "How it works" })).toHaveAttribute(
    "href",
    "/how-it-works"
  );
  expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
  expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");

  fireEvent.click(helpToggle);
  expect(screen.queryByRole("link", { name: "Privacy" })).not.toBeInTheDocument();
});

test("contact and help behave as an accordion and reuse the official contact details", () => {
  renderNavbar();
  const helpToggle = screen.getByRole("button", { name: /help & support/i });
  const contactToggle = screen.getByRole("button", { name: /contact/i });

  fireEvent.click(helpToggle);
  fireEvent.click(contactToggle);

  expect(helpToggle).toHaveAttribute("aria-expanded", "false");
  expect(contactToggle).toHaveAttribute("aria-expanded", "true");
  expect(screen.queryByRole("link", { name: "Privacy" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /email unimarket\.app\.official@gmail\.com/i })).toHaveAttribute(
    "href",
    "mailto:unimarket.app.official@gmail.com"
  );
  expect(screen.getByRole("link", { name: /phone \+66 817-374-337/i })).toHaveAttribute(
    "href",
    "tel:+66817374337"
  );
  expect(screen.getByRole("link", { name: /address bangkok, thailand/i })).toBeInTheDocument();
});

test("clicking away from an open dropdown closes its submenu", () => {
  renderNavbar();
  const helpToggle = screen.getByRole("button", { name: /help & support/i });

  fireEvent.click(helpToggle);
  expect(helpToggle).toHaveAttribute("aria-expanded", "true");

  fireEvent.pointerDown(screen.getByText("Explore UniMarket"));
  expect(helpToggle).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("link", { name: "Privacy" })).not.toBeInTheDocument();
});

test("authenticated users can log out from the menu", async () => {
  const { logout } = renderNavbar({ _id: "user-a", fullName: "User A" });

  fireEvent.click(screen.getByRole("button", { name: /logout/i }));

  await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
});
