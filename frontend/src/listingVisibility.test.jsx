import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ItemsPage from "./Components/ItemsPage/ItemsPage";
import ProductsDetails from "./Components/Products/ProductsDetails";
import ProfilePage from "./Components/Profile/forms/ProfilePage";
import AccommodationDetails from "./Components/Accommodation/AccommodationDetails";
import AccommodationSection from "./Components/Accommodation/AccommodationSection";
import BottomNav from "./Components/BottomNavBar/BottomNav";
import CartPage from "./Components/BottomNavBar/ShoppingCart/CartPage";
import SearchPage from "./Components/Search/SearchPage";
import { normalizeSeller } from "./Components/Logics/useItemsList";
import { normalizeAccommodationSeller } from "./Components/Logics/useAccommodations";
import { orderSelectedFirst } from "./Components/Feed/ListingFeed";
import { getDescriptionPreview } from "./Components/Feed/FeedDescription";
import { axiosInstance } from "./Components/lib/axios";

let mockItems = [];
let mockAuthUser = null;
let mockRouteId = null;
let mockAccommodations = [];
let mockPathname = "";
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  MemoryRouter: ({ children }) => children,
  Routes: ({ children }) => children,
  Route: ({ element }) => element,
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: mockPathname || (mockRouteId ? `/products/${mockRouteId}` : "/products"), search: "" }),
  useParams: () => ({ id: mockRouteId }),
  useSearchParams: () => [new URLSearchParams()],
}), { virtual: true });

jest.mock("./Components/Logics/useItemsList", () => ({
  ...jest.requireActual("./Components/Logics/useItemsList"),
  useItemsList: () => ({ items: mockItems, isLoading: false, error: "" }),
}));

jest.mock("./Components/Logics/useAccommodations", () => ({
  ...jest.requireActual("./Components/Logics/useAccommodations"),
  useAccommodations: () => ({ accommodations: mockAccommodations, isLoading: false, error: "" }),
}));

jest.mock("./Components/store/useAuthStore", () => ({
  useAuthStore: (selector) => {
    const state = {
      authUser: mockAuthUser,
      updateProfile: jest.fn(),
      logout: jest.fn(),
      isUpdatingProfile: false,
      isRemovingProfilePhoto: false,
      totalUnread: 0,
      removeProfilePhoto: jest.fn(),
    };
    return typeof selector === "function" ? selector(state) : state;
  },
}));

jest.mock("./Components/lib/axios", () => ({
  axiosInstance: {
    get: jest.fn(),
    delete: jest.fn(),
  },
}));

const userA = { _id: "user-a", fullName: "User A" };
const userB = { _id: "user-b", fullName: "User B" };
const ownItem = {
  _id: "item-a",
  title: "User A Desk",
  price: 500,
  description: "Desk",
  images: [],
  user: userA,
  seller: { id: userA._id, fullName: userA.fullName },
};
const otherItem = {
  _id: "item-b",
  title: "User B Lamp",
  price: 200,
  description: "Lamp",
  images: [],
  user: userB,
  seller: { id: userB._id, fullName: userB.fullName },
};
const ownAccommodation = {
  _id: "stay-a",
  title: "User A Studio",
  location: "Near campus",
  price: 6000,
  pricePeriod: "month",
  accommodationType: "Studio",
  description: "Furnished studio",
  images: [],
  user: userA,
  seller: { id: userA._id, fullName: userA.fullName },
};

beforeEach(() => {
  mockItems = [ownItem, otherItem];
  mockAuthUser = userA;
  mockRouteId = null;
  mockAccommodations = [];
  mockPathname = "";
  mockNavigate.mockReset();
  axiosInstance.get.mockReset();
});

test("the items page includes both the signed-in user's listing and other users' listings", () => {
  render(
    <MemoryRouter initialEntries={["/products"]}>
      <ItemsPage />
    </MemoryRouter>
  );

  expect(screen.getByText("User A Desk")).toBeInTheDocument();
  expect(screen.getByText("User B Lamp")).toBeInTheDocument();
});

test("an owner can open their item without being offered a self-chat", () => {
  mockRouteId = "item-a";
  const { container } = render(
    <MemoryRouter initialEntries={["/products/item-a"]}>
      <Routes>
        <Route path="/products/:id" element={<ProductsDetails AddtoCart={jest.fn()} />} />
      </Routes>
    </MemoryRouter>
  );

  expect(screen.getByText("My Listing")).toBeInTheDocument();
  expect(within(container.querySelector('[data-listing-id="item-a"]')).queryByRole("button", { name: /chat with seller/i })).not.toBeInTheDocument();
});

test("another user still sees the chat action on a listing", () => {
  mockRouteId = "item-b";
  const addToCart = jest.fn();
  const { container } = render(
    <MemoryRouter initialEntries={["/products/item-b"]}>
      <Routes>
        <Route path="/products/:id" element={<ProductsDetails AddtoCart={addToCart} />} />
      </Routes>
    </MemoryRouter>
  );

  const posts = container.querySelectorAll("[data-listing-id]");
  expect(posts[0]).toHaveAttribute("data-listing-id", "item-b");
  expect(posts[1]).toHaveAttribute("data-listing-id", "item-a");
  expect(within(posts[0]).getByRole("button", { name: /chat with seller/i })).toBeInTheDocument();
  fireEvent.click(within(posts[0]).getByRole("button", { name: /add to cart/i }));
  expect(addToCart).toHaveBeenCalledWith(otherItem);
});

test("selected-first ordering keeps every listing once", () => {
  const ordered = orderSelectedFirst([ownItem, otherItem], "item-b");
  expect(ordered.map((listing) => listing._id)).toEqual(["item-b", "item-a"]);
  expect(new Set(ordered.map((listing) => listing._id)).size).toBe(2);
});

test("long feed descriptions expand and collapse without losing content", () => {
  const longDescription = "First sentence introduces the listing. Second sentence gives the condition. Third sentence adds pickup details.\nFourth sentence preserves this new line.";
  mockItems = [{ ...otherItem, description: longDescription }];
  mockRouteId = "item-b";

  render(
    <MemoryRouter>
      <ProductsDetails AddtoCart={jest.fn()} />
    </MemoryRouter>
  );

  const moreButton = screen.getByRole("button", { name: "...more" });
  expect(screen.queryByText(longDescription, { exact: false })).not.toBeInTheDocument();
  fireEvent.click(moreButton);
  expect(document.querySelector(".listing-feed-description").textContent).toContain(longDescription);
  expect(screen.getByRole("button", { name: "...less" })).toBeInTheDocument();
});

test("description previews use sentences and do not split decimal numbers", () => {
  expect(getDescriptionPreview("Good desk. Excellent condition!")).toMatchObject({
    preview: "Good desk. Excellent condition!",
    shouldTruncate: false,
  });
  expect(getDescriptionPreview("It costs 3.5 Baht. Available now! Contact me?"))
    .toMatchObject({
      preview: "It costs 3.5 Baht. Available now!",
      shouldTruncate: true,
    });
});

test("description expansion stays in natural post flow and is independent", () => {
  const longDescription = "Sentence one. Sentence two. Sentence three. Sentence four.";
  mockItems = [
    { ...ownItem, description: longDescription },
    { ...otherItem, description: longDescription },
  ];
  mockRouteId = "item-a";

  const { container } = render(
    <MemoryRouter>
      <ProductsDetails AddtoCart={jest.fn()} />
    </MemoryRouter>
  );

  const firstPost = container.querySelector('[data-listing-id="item-a"]');
  const secondPost = container.querySelector('[data-listing-id="item-b"]');
  fireEvent.click(within(secondPost).getByRole("button", { name: "...more" }));

  expect(within(firstPost).getByRole("button", { name: "...more" })).toBeInTheDocument();
  expect(within(secondPost).getByRole("button", { name: "...less" })).toBeInTheDocument();
  expect(secondPost.querySelector(".listing-feed-description-shell")).not.toHaveAttribute("style");
  expect(firstPost.compareDocumentPosition(secondPost) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

  fireEvent.click(within(secondPost).getByRole("button", { name: "...less" }));
  expect(within(secondPost).getByRole("button", { name: "...more" })).toBeInTheDocument();
  expect(secondPost.querySelector(".listing-feed-description-shell")).not.toHaveAttribute("style");
});

test("empty descriptions add no empty area or controls", () => {
  mockItems = [{ ...otherItem, description: "" }];
  mockRouteId = "item-b";

  const { container } = render(
    <MemoryRouter>
      <ProductsDetails AddtoCart={jest.fn()} />
    </MemoryRouter>
  );

  expect(container.querySelector(".listing-feed-description-shell")).toBeNull();
  expect(screen.queryByRole("button", { name: /more|less/i })).not.toBeInTheDocument();
});

test("feed carousel updates arrows, swipe position, counter, and indicator dots", () => {
  mockItems = [{
    ...otherItem,
    images: ["one.jpg", "two.jpg", "three.jpg"],
  }];
  mockRouteId = "item-b";

  const { container } = render(
    <MemoryRouter>
      <ProductsDetails AddtoCart={jest.fn()} />
    </MemoryRouter>
  );

  const gallery = container.querySelector(".listing-feed-gallery");
  const dots = screen.getAllByRole("button", { name: /show image \d of 3/i });
  expect(screen.getByText("1/3")).toBeInTheDocument();
  expect(dots[0]).toHaveAttribute("aria-current", "true");

  fireEvent.click(screen.getByRole("button", { name: "Next image" }));
  expect(screen.getByText("2/3")).toBeInTheDocument();
  expect(dots[1]).toHaveAttribute("aria-current", "true");

  fireEvent.touchStart(gallery, { touches: [{ clientX: 180, clientY: 120 }] });
  fireEvent.touchEnd(gallery, { changedTouches: [{ clientX: 70, clientY: 125 }] });
  expect(screen.getByText("3/3")).toBeInTheDocument();
  expect(dots[2]).toHaveAttribute("aria-current", "true");

  fireEvent.touchStart(gallery, { touches: [{ clientX: 70, clientY: 80 }] });
  fireEvent.touchEnd(gallery, { changedTouches: [{ clientX: 74, clientY: 190 }] });
  expect(screen.getByText("3/3")).toBeInTheDocument();
});

test("an accommodation owner can open their listing without a self-chat action", async () => {
  mockRouteId = "stay-a";
  mockAccommodations = [ownAccommodation];

  const { container } = render(
    <MemoryRouter>
      <AccommodationDetails />
    </MemoryRouter>
  );

  expect(screen.getByText("My Listing")).toBeInTheDocument();
  expect(within(container.querySelector('[data-listing-id="stay-a"]')).queryByRole("button", { name: /chat with host/i })).not.toBeInTheDocument();
});

test("another user can chat with an accommodation owner", async () => {
  mockRouteId = "stay-a";
  mockAuthUser = userB;
  mockAccommodations = [ownAccommodation];

  render(
    <MemoryRouter>
      <AccommodationDetails />
    </MemoryRouter>
  );

  expect(screen.getByRole("button", { name: /chat with host/i })).toBeInTheDocument();
});

test("profile retrieves and displays items and accommodations from their own APIs", async () => {
  axiosInstance.get.mockImplementation((path) => {
    if (path === "/items/mine") return Promise.resolve({ data: [ownItem] });
    if (path === "/accommodations/mine") {
      return Promise.resolve({
        data: [{ ...ownAccommodation, createdAt: "2026-08-28T00:00:00.000Z" }],
      });
    }
    return Promise.reject(new Error(`Unexpected request: ${path}`));
  });

  render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>
  );

  await waitFor(() => {
    expect(axiosInstance.get).toHaveBeenCalledWith("/items/mine", expect.any(Object));
    expect(axiosInstance.get).toHaveBeenCalledWith("/accommodations/mine", expect.any(Object));
  });
  expect(await screen.findByText("User A Desk")).toBeInTheDocument();
  expect(screen.getByText("User A Studio")).toBeInTheDocument();
  expect(screen.getByText(/Accommodation · per month/)).toBeInTheDocument();
  expect(screen.getAllByText("Listed by User A")).toHaveLength(2);
  screen.getAllByAltText("User A").forEach((avatar) => {
    expect(avatar).toHaveAttribute("src", "/Images/no-pfp.jpg");
  });
});

test("populated owners replace stale listing snapshots without mixing users", () => {
  const staleSnapshot = { id: "old-user", fullName: "Old Name", profilePic: "old.jpg" };
  const userAOwner = { user: { ...userA, profilePic: "user-a.jpg" }, seller: staleSnapshot };
  const userBOwner = { user: { ...userB, profilePic: "user-b.jpg" }, seller: staleSnapshot };

  expect(normalizeSeller(userAOwner)).toEqual({
    id: "user-a",
    fullName: "User A",
    profilePic: "user-a.jpg",
  });
  expect(normalizeAccommodationSeller(userBOwner)).toEqual({
    id: "user-b",
    fullName: "User B",
    profilePic: "user-b.jpg",
  });
});

test("accommodation cards show the database-backed owner name and profile picture", () => {
  mockAccommodations = [{
    ...ownAccommodation,
    seller: { id: "user-a", fullName: "User A", profilePic: "https://example.com/user-a.jpg" },
  }];

  render(<MemoryRouter><AccommodationSection /></MemoryRouter>);

  expect(screen.getByText("Listed by User A")).toBeInTheDocument();
  expect(screen.getByAltText("User A")).toHaveAttribute("src", "https://example.com/user-a.jpg");
});

test("bottom navigation switches between the default icon and current user's photo", () => {
  const { container, rerender } = render(<MemoryRouter><BottomNav /></MemoryRouter>);
  const profileButton = screen.getByRole("button", { name: "Profile" });
  expect(profileButton.querySelector("img")).toBeNull();

  mockAuthUser = { ...userA, profilePic: "https://example.com/new-user-a.jpg" };
  rerender(<MemoryRouter><BottomNav /></MemoryRouter>);
  expect(container.querySelector(".bottom-nav-profile-photo")).toHaveAttribute(
    "src",
    "https://example.com/new-user-a.jpg"
  );
});

test("search page mixes and filters database-backed items and accommodations", () => {
  mockItems = [ownItem, otherItem];
  mockAccommodations = [{
    ...ownAccommodation,
    description: "A furnished room with a study desk.",
  }];
  mockPathname = "/search";

  render(<MemoryRouter><SearchPage /></MemoryRouter>);

  expect(screen.getByText("User A Desk")).toBeInTheDocument();
  expect(screen.getByText("User B Lamp")).toBeInTheDocument();
  expect(screen.getByText("User A Studio")).toBeInTheDocument();
  expect(screen.getAllByText("Item")).toHaveLength(2);
  expect(screen.getByText("Accommodation · Studio")).toBeInTheDocument();

  fireEvent.change(screen.getByPlaceholderText("What are you looking for?"), {
    target: { value: "desk" },
  });
  expect(screen.getByText("User A Desk")).toBeInTheDocument();
  expect(screen.getByText("User A Studio")).toBeInTheDocument();
  expect(screen.queryByText("User B Lamp")).not.toBeInTheDocument();

  fireEvent.click(screen.getByText("User A Desk").closest(".item-card"));
  expect(mockNavigate).toHaveBeenCalledWith("/products/item-a");
});

test("bottom Search opens its dedicated active page and empty Cart browses Home", () => {
  mockPathname = "/search";
  const { unmount } = render(<MemoryRouter><BottomNav /></MemoryRouter>);
  const searchButton = screen.getByRole("button", { name: "Search" });
  expect(searchButton).toHaveAttribute("aria-current", "page");
  fireEvent.click(searchButton);
  expect(mockNavigate).toHaveBeenCalledWith("/search");
  unmount();

  mockNavigate.mockClear();
  render(<MemoryRouter><CartPage cartItems={[]} setCartItems={jest.fn()} /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Browse items" }));
  expect(mockNavigate).toHaveBeenCalledWith("/");
});
