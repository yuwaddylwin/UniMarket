import { render, screen } from "@testing-library/react";
import LoadingSpinner from "./Components/common/LoadingSpinner";

test("announces the loading state to assistive technology", () => {
  render(<LoadingSpinner label="Loading items…" />);

  expect(screen.getByRole("status")).toHaveTextContent("Loading items…");
});
