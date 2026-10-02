import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Sell from "./sell";
import { axiosInstance } from "../../lib/axios";

const mockNavigate = jest.fn();
const mockAccommodation = {
  _id: "stay-a",
  listingType: "accommodation",
  title: "Campus Studio",
  location: "Near campus",
  price: 6200,
  pricePeriod: "month",
  description: "A furnished studio.",
  accommodationType: "Studio",
  bedrooms: 1,
  contactInfo: "owner@example.com",
  images: [
    {
      url: "https://example.com/studio.jpg",
      publicId: "accommodations/studio",
    },
  ],
};

jest.mock(
  "react-router-dom",
  () => ({
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: { mode: "edit", item: mockAccommodation } }),
  }),
  { virtual: true }
);

jest.mock("../../lib/axios", () => ({
  axiosInstance: { post: jest.fn(), put: jest.fn() },
}));

beforeEach(() => {
  mockNavigate.mockReset();
  axiosInstance.put.mockReset().mockResolvedValue({ data: {} });
});

test("edits an existing accommodation through the shared listing form", async () => {
  render(<Sell />);

  expect(
    screen.getByRole("heading", { name: "Edit your accommodation" })
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Accommodation name")).toHaveValue(
    "Campus Studio"
  );
  expect(screen.getByLabelText("Location")).toHaveValue("Near campus");
  expect(screen.getByLabelText("Price (THB)")).toHaveValue(6200);
  expect(screen.getByLabelText(/Description/)).toHaveValue(
    "A furnished studio."
  );

  fireEvent.change(screen.getByLabelText("Price (THB)"), {
    target: { value: "6800" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

  await waitFor(() =>
    expect(axiosInstance.put).toHaveBeenCalledWith(
      "/accommodations/stay-a",
      expect.any(FormData)
    )
  );
  const submitted = axiosInstance.put.mock.calls[0][1];
  expect(submitted.get("price")).toBe("6800");
  expect(submitted.get("existingImages")).toContain("accommodations/studio");
  expect(mockNavigate).toHaveBeenCalledWith("/profile", {
    replace: true,
    state: {
      updatedListing: expect.objectContaining({
        _id: "stay-a",
        listingType: "accommodation",
      }),
    },
  });
});
