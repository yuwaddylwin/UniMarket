import { render, screen } from "@testing-library/react";
import Footer from "./footer";

jest.mock("react-router-dom", () => ({
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
}), { virtual: true });

test("home help links point to How it works, Privacy, and Terms", () => {
  render(<Footer />);

  expect(screen.getByRole("link", { name: /how it works/i })).toHaveAttribute("href", "/#home-discovery");
  expect(screen.getByRole("link", { name: /privacy/i })).toHaveAttribute("href", "/privacy");
  expect(screen.getByRole("link", { name: /terms/i })).toHaveAttribute("href", "/terms");
  expect(screen.queryByText(/safety help/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/get support/i)).not.toBeInTheDocument();
});
