import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ItemsPage from "./Components/Items/ItemsPage";
import ProductsDetails from "./Components/Items/ProductsDetails";
import ProfilePage from "./Components/Profile/ProfilePage";
import AccommodationDetails from "./Components/Accommodation/AccommodationDetails";
import AccommodationSection from "./Components/Accommodation/AccommodationSection";
import BottomNav from "./Components/BottomNavBar/BottomNav";
import SavedPage from "./Components/Saved/SavedPage";
import { useSavedStore } from "./store/useSavedStore";
import SearchPage from "./Components/Search/SearchPage";
import { normalizeSeller } from "./hooks/useItemsList";
import { normalizeAccommodationSeller } from "./hooks/useAccommodations";
import { orderSelectedFirst } from "./Components/Feed/ListingFeed";
import { getDescriptionPreview } from "./Components/Feed/FeedDescription";
import { axiosInstance } from "./lib/axios";

let mockItems = [];
let mockAuthUser = null;
let mockRouteId = null;
let mockAccommodations = [];
let mockPathname = "";
const mockNavigate = jest.fn();
const mockUpdateProfile = jest.fn();

jest.mock(
  "react-router-dom",
  () => ({
    Link: ({ to, children, ...props }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    MemoryRouter: ({ children }) => children,
    Routes: ({ children }) => children,
    Route: ({ element }) => element,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      pathname:
        mockPathname ||
        (mockRouteId ? `/products/${mockRouteId}` : "/products"),
      search: "",
    }),
    useParams: () => ({ id: mockRouteId }),
    useSearchParams: () => [new URLSearchParams()],
  }),
  { virtual: true }
);

jest.mock("./hooks/useItemsList", () => ({
  ...jest.requireActual("./hooks/useItemsList"),
  useItemsList: () => ({ items: mockItems, isLoading: false, error: "" }),
}));

jest.mock("./hooks/useAccommodations", () => ({
  ...jest.requireActual("./hooks/useAccommodations"),
  useAccommodations: () => ({
    accommodations: mockAccommodations,
    isLoading: false,
    error: "",
  }),
}));

jest.mock("./store/useAuthStore", () => ({
  useAuthStore: (selector) => {
    const state = {
      authUser: mockAuthUser,
      updateProfile: mockUpdateProfile,
      logout: jest.fn(),
      isUpdatingProfile: false,
      isRemovingProfilePhoto: false,
      totalUnread: 0,
      removeProfilePhoto: jest.fn(),
    };
    return typeof selector === "function" ? selector(state) : state;
  },
}));

jest.mock("./lib/axios", () => ({
  axiosInstance: {
    get: jest.fn(),
    patch: jest.fn(),
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
  category: "Items",
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
  useSavedStore.setState({
    userId: userA._id,
    entries: [],
    pending: {},
    loaded: true,
    loading: false,
    error: "",
  });
  mockAuthUser = userA;
  mockRouteId = null;
  mockAccommodations = [];
  mockPathname = "";
  mockNavigate.mockReset();
  mockUpdateProfile.mockReset().mockResolvedValue(undefined);
  axiosInstance.get.mockReset();
  axiosInstance.patch.mockReset().mockResolvedValue({ data: {} });
  axiosInstance.delete.mockReset().mockResolvedValue({ data: {} });
});

test("the items page includes both the signed-in user's listing and other users' listings", () => {
  render(
    <MemoryRouter initialEntries={["/products"]}>
      <ItemsPage />
    </MemoryRouter>
  );

  expect(screen.getByRole("link", { name: /User A Desk/ })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /User B Lamp/ })).toBeInTheDocument();
});

test("an owner can open their item without being offered a self-chat", () => {
  mockRouteId = "item-a";
  render(
    <MemoryRouter initialEntries={["/products/item-a"]}>
      <Routes>
        <Route path="/products/:id" element={<ProductsDetails />} />
      </Routes>
    </MemoryRouter>
  );

  expect(screen.getByText("My Listing")).toBeInTheDocument();
  expect(
    within(screen.getAllByRole("article")[0]).queryByRole("button", {
      name: /chat with seller/i,
    })
  ).not.toBeInTheDocument();
});

test("another user still sees the chat action on a listing", () => {
  mockRouteId = "item-b";
  render(
    <MemoryRouter initialEntries={["/products/item-b"]}>
      <Routes>
        <Route path="/products/:id" element={<ProductsDetails />} />
      </Routes>
    </MemoryRouter>
  );

  const posts = screen.getAllByRole("article");
  expect(posts[0]).toHaveAttribute("data-listing-id", "item-b");
  expect(posts[1]).toHaveAttribute("data-listing-id", "item-a");
  expect(within(posts[0]).queryByText("Items")).not.toBeInTheDocument();
  expect(within(posts[0]).getByText("฿200")).toHaveClass("listing-price");
  expect(
    within(posts[0]).getByRole("button", { name: /chat with seller/i })
  ).toBeInTheDocument();
  expect(
    within(posts[0]).getByRole("button", { name: "Save" })
  ).toBeInTheDocument();
  fireEvent.click(
    within(posts[0]).getByRole("button", { name: /chat with seller/i })
  );
  expect(mockNavigate).toHaveBeenCalledWith("/chat/user-b");
});

test("selected-first ordering keeps every listing once", () => {
  const ordered = orderSelectedFirst([ownItem, otherItem], "item-b");
  expect(ordered.map((listing) => listing._id)).toEqual(["item-b", "item-a"]);
  expect(new Set(ordered.map((listing) => listing._id)).size).toBe(2);
});

test("long feed descriptions expand and collapse without losing content", () => {
  const longDescription =
    "First sentence introduces the listing. Second sentence gives the condition. Third sentence adds pickup details.\nFourth sentence preserves this new line.";
  mockItems = [{ ...otherItem, description: longDescription }];
  mockRouteId = "item-b";

  render(
    <MemoryRouter>
      <ProductsDetails />
    </MemoryRouter>
  );

  const moreButton = screen.getByRole("button", { name: "...more" });
  expect(
    screen.queryByText(longDescription, { exact: false })
  ).not.toBeInTheDocument();
  fireEvent.click(moreButton);
  expect(
    screen.getByText(longDescription, {
      exact: false,
      normalizer: (value) => value,
    })
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "...less" })).toBeInTheDocument();
});

test("description previews use sentences and do not split decimal numbers", () => {
  expect(
    getDescriptionPreview("Good desk. Excellent condition!")
  ).toMatchObject({
    preview: "Good desk. Excellent condition!",
    shouldTruncate: false,
  });
  expect(
    getDescriptionPreview("It costs 3.5 Baht. Available now! Contact me?")
  ).toMatchObject({
    preview: "It costs 3.5 Baht. Available now!",
    shouldTruncate: true,
  });
});

test("description expansion stays in natural post flow and is independent", () => {
  const longDescription =
    "Sentence one. Sentence two. Sentence three. Sentence four.";
  mockItems = [
    { ...ownItem, description: longDescription },
    { ...otherItem, description: longDescription },
  ];
  mockRouteId = "item-a";

  render(
    <MemoryRouter>
      <ProductsDetails />
    </MemoryRouter>
  );

  const [firstPost, secondPost] = screen.getAllByRole("article");
  expect(firstPost).toHaveAttribute("data-listing-id", "item-a");
  expect(secondPost).toHaveAttribute("data-listing-id", "item-b");
  fireEvent.click(within(secondPost).getByRole("button", { name: "...more" }));

  expect(
    within(firstPost).getByRole("button", { name: "...more" })
  ).toBeInTheDocument();
  expect(
    within(secondPost).getByRole("button", { name: "...less" })
  ).toBeInTheDocument();
  // This checks CSS structure or targets a hidden/noninteractive element with no accessible role.
  expect(
    // eslint-disable-next-line testing-library/no-node-access
    secondPost.querySelector(".listing-feed-description-shell")
  ).not.toHaveAttribute("style");
  expect(
    firstPost.compareDocumentPosition(secondPost) &
      Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();

  fireEvent.click(within(secondPost).getByRole("button", { name: "...less" }));
  expect(
    within(secondPost).getByRole("button", { name: "...more" })
  ).toBeInTheDocument();
  // This checks CSS structure or targets a hidden/noninteractive element with no accessible role.
  expect(
    // eslint-disable-next-line testing-library/no-node-access
    secondPost.querySelector(".listing-feed-description-shell")
  ).not.toHaveAttribute("style");
});

test("empty descriptions add no empty area or controls", () => {
  mockItems = [{ ...otherItem, description: "" }];
  mockRouteId = "item-b";

  const { container } = render(
    <MemoryRouter>
      <ProductsDetails />
    </MemoryRouter>
  );

  // This checks CSS structure or targets a hidden/noninteractive element with no accessible role.
  // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
  expect(container.querySelector(".listing-feed-description-shell")).toBeNull();
  expect(
    screen.queryByRole("button", { name: /more|less/i })
  ).not.toBeInTheDocument();
});

test("feed carousel updates arrows, swipe position, counter, and indicator dots", () => {
  mockItems = [
    {
      ...otherItem,
      images: ["one.jpg", "two.jpg", "three.jpg"],
    },
  ];
  mockRouteId = "item-b";

  const { container } = render(
    <MemoryRouter>
      <ProductsDetails />
    </MemoryRouter>
  );

  // This checks CSS structure or targets a hidden/noninteractive element with no accessible role.
  // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
  const gallery = container.querySelector(".listing-feed-gallery");
  const dots = screen.getAllByRole("button", { name: /show image \d of 3/i });
  expect(screen.getByText("1/3")).toBeInTheDocument();
  expect(dots[0]).toHaveAttribute("aria-current", "true");

  fireEvent.click(screen.getByRole("button", { name: "Next image" }));
  expect(screen.getByText("2/3")).toBeInTheDocument();
  expect(dots[1]).toHaveAttribute("aria-current", "true");

  fireEvent.touchStart(gallery, { touches: [{ clientX: 180, clientY: 120 }] });
  fireEvent.touchEnd(gallery, {
    changedTouches: [{ clientX: 70, clientY: 125 }],
  });
  expect(screen.getByText("3/3")).toBeInTheDocument();
  expect(dots[2]).toHaveAttribute("aria-current", "true");

  fireEvent.touchStart(gallery, { touches: [{ clientX: 70, clientY: 80 }] });
  fireEvent.touchEnd(gallery, {
    changedTouches: [{ clientX: 74, clientY: 190 }],
  });
  expect(screen.getByText("3/3")).toBeInTheDocument();
});

test("an accommodation owner can open their listing without a self-chat action", async () => {
  mockRouteId = "stay-a";
  mockAccommodations = [ownAccommodation];

  render(
    <MemoryRouter>
      <AccommodationDetails />
    </MemoryRouter>
  );

  expect(screen.getByText("My Listing")).toBeInTheDocument();
  expect(
    within(screen.getByRole("article")).queryByRole("button", {
      name: /chat with seller/i,
    })
  ).not.toBeInTheDocument();
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

  expect(
    screen.getByRole("button", { name: /chat with seller/i })
  ).toBeInTheDocument();
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

  await waitFor(() =>
    expect(axiosInstance.get).toHaveBeenCalledWith(
      "/items/mine",
      expect.any(Object)
    )
  );
  await waitFor(() =>
    expect(axiosInstance.get).toHaveBeenCalledWith(
      "/accommodations/mine",
      expect.any(Object)
    )
  );
  expect(await screen.findByText("User A Desk")).toBeInTheDocument();
  expect(screen.getByText("User A Studio")).toBeInTheDocument();
  expect(screen.getByText(/Accommodation · per month/)).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Edit profile photo" })
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Edit profile" })
  ).toBeInTheDocument();
  expect(screen.getAllByText("User A")).toHaveLength(3);
  expect(screen.queryByText(/Listed by/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/change photo/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/remove photo/i)).not.toBeInTheDocument();
  screen.getAllByAltText("User A").forEach((avatar) => {
    expect(avatar).toHaveAttribute("src", "/Images/no-pfp.jpg");
  });
});

test("profile photo edit uploads a validated image through the persisted profile action", async () => {
  axiosInstance.get.mockImplementation(() => Promise.resolve({ data: [] }));
  const { container } = render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>
  );
  // This checks CSS structure or targets a hidden/noninteractive element with no accessible role.
  // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
  const input = container.querySelector('input[type="file"]');
  const photo = new File(["photo"], "avatar.png", { type: "image/png" });

  fireEvent.change(input, { target: { files: [photo] } });

  const saveButton = await screen.findByRole("button", { name: /save photo/i });
  expect(screen.getAllByAltText("User A")[0]).toHaveAttribute(
    "src",
    expect.stringMatching(/^data:image\/png;base64,/)
  );
  expect(mockUpdateProfile).not.toHaveBeenCalled();
  fireEvent.click(saveButton);

  await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledTimes(1));
  expect(mockUpdateProfile.mock.calls[0][0].profilePic).toMatch(
    /^data:image\/png;base64,/
  );
});

test("an owner can mark an active profile listing as done without deleting it", async () => {
  axiosInstance.get.mockImplementation((path) => {
    if (path === "/items/mine") return Promise.resolve({ data: [ownItem] });
    if (path === "/accommodations/mine") return Promise.resolve({ data: [] });
    return Promise.reject(new Error(`Unexpected request: ${path}`));
  });
  render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>
  );

  expect(await screen.findByText("User A Desk")).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Open actions for User A Desk" })
  );
  fireEvent.click(screen.getByRole("button", { name: "Mark as done" }));

  expect(
    screen.getByRole("dialog", { name: "Mark as sold?" })
  ).toBeInTheDocument();
  expect(axiosInstance.patch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Yes, mark as sold" }));

  await waitFor(() =>
    expect(axiosInstance.patch).toHaveBeenCalledWith("/items/item-a/status", {
      status: "sold",
    })
  );
  await waitFor(() =>
    expect(screen.queryByText("User A Desk")).not.toBeInTheDocument()
  );
  expect(axiosInstance.delete).not.toHaveBeenCalled();
});

test("deleting a profile listing requires confirmation and removes it after success", async () => {
  axiosInstance.get.mockImplementation((path) => {
    if (path === "/items/mine") return Promise.resolve({ data: [ownItem] });
    if (path === "/accommodations/mine") return Promise.resolve({ data: [] });
    return Promise.reject(new Error(`Unexpected request: ${path}`));
  });
  render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>
  );

  expect(await screen.findByText("User A Desk")).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Open actions for User A Desk" })
  );
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));

  expect(
    screen.getByText(/Are you sure you want to delete this listing\?/)
  ).toBeInTheDocument();
  expect(axiosInstance.delete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByText("User A Desk")).toBeInTheDocument();

  fireEvent.click(
    screen.getByRole("button", { name: "Open actions for User A Desk" })
  );
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  fireEvent.click(screen.getByRole("button", { name: "Yes, Delete" }));

  await waitFor(() =>
    expect(axiosInstance.delete).toHaveBeenCalledWith("/items/item-a")
  );
  await waitFor(() =>
    expect(screen.queryByText("User A Desk")).not.toBeInTheDocument()
  );
});

test("an accommodation listing offers edit, delete, and mark as done actions", async () => {
  axiosInstance.get.mockImplementation((path) => {
    if (path === "/items/mine") return Promise.resolve({ data: [] });
    if (path === "/accommodations/mine")
      return Promise.resolve({ data: [ownAccommodation] });
    return Promise.reject(new Error(`Unexpected request: ${path}`));
  });
  render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>
  );

  expect(await screen.findByText("User A Studio")).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Open actions for User A Studio" })
  );
  expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Mark as done" })
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  expect(mockNavigate).toHaveBeenCalledWith("/post", {
    state: {
      mode: "edit",
      item: expect.objectContaining({
        _id: "stay-a",
        listingType: "accommodation",
      }),
    },
  });
});

test("populated owners replace stale listing snapshots without mixing users", () => {
  const staleSnapshot = {
    id: "old-user",
    fullName: "Old Name",
    profilePic: "old.jpg",
  };
  const userAOwner = {
    user: { ...userA, profilePic: "user-a.jpg" },
    seller: staleSnapshot,
  };
  const userBOwner = {
    user: { ...userB, profilePic: "user-b.jpg" },
    seller: staleSnapshot,
  };

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
  mockAccommodations = [
    {
      ...ownAccommodation,
      seller: {
        id: "user-a",
        fullName: "User A",
        profilePic: "https://example.com/user-a.jpg",
      },
    },
  ];

  render(
    <MemoryRouter>
      <AccommodationSection />
    </MemoryRouter>
  );

  expect(screen.getByText("User A")).toBeInTheDocument();
  expect(screen.queryByText(/Listed by/i)).not.toBeInTheDocument();
  expect(screen.getByAltText("User A")).toHaveAttribute(
    "src",
    "https://example.com/user-a.jpg"
  );
});

test("bottom navigation switches between the default icon and current user's photo", () => {
  const { rerender } = render(
    <MemoryRouter>
      <BottomNav />
    </MemoryRouter>
  );
  const profileButton = screen.getByRole("button", { name: "Profile" });
  expect(within(profileButton).queryByAltText("")).not.toBeInTheDocument();

  mockAuthUser = { ...userA, profilePic: "https://example.com/new-user-a.jpg" };
  rerender(
    <MemoryRouter>
      <BottomNav />
    </MemoryRouter>
  );
  expect(within(profileButton).getByAltText("")).toHaveAttribute(
    "src",
    "https://example.com/new-user-a.jpg"
  );
});

test("search page mixes and filters database-backed items and accommodations", () => {
  mockItems = [ownItem, otherItem];
  mockAccommodations = [
    {
      ...ownAccommodation,
      description: "A furnished room with a study desk.",
    },
  ];
  mockPathname = "/search";

  render(
    <MemoryRouter>
      <SearchPage />
    </MemoryRouter>
  );

  expect(screen.getByText("User A Desk")).toBeInTheDocument();
  expect(screen.getByText("User B Lamp")).toBeInTheDocument();
  expect(screen.getByText("User A Studio")).toBeInTheDocument();
  expect(screen.queryByText("Item")).not.toBeInTheDocument();
  expect(screen.queryByText("Accommodation · Studio")).not.toBeInTheDocument();
  // This checks CSS structure or targets a hidden/noninteractive element with no accessible role.
  expect(
    // eslint-disable-next-line testing-library/no-node-access
    document.querySelector(".accommodation-image > span, .item-type-badge")
  ).toBeNull();

  fireEvent.change(screen.getByPlaceholderText("What are you looking for?"), {
    target: { value: "desk" },
  });
  expect(screen.getByText("User A Desk")).toBeInTheDocument();
  expect(screen.getByText("User A Studio")).toBeInTheDocument();
  expect(screen.queryByText("User B Lamp")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("link", { name: /User A Desk/ }));
  expect(mockNavigate).toHaveBeenCalledWith("/products/item-a");
});

test("bottom Search opens its dedicated active page and empty Saved browses Home", () => {
  mockPathname = "/search";
  const { unmount } = render(
    <MemoryRouter>
      <BottomNav />
    </MemoryRouter>
  );
  const searchButton = screen.getByRole("button", { name: "Search" });
  expect(searchButton).toHaveAttribute("aria-current", "page");
  fireEvent.click(searchButton);
  expect(mockNavigate).toHaveBeenCalledWith("/search");
  unmount();

  mockNavigate.mockClear();
  render(
    <MemoryRouter>
      <SavedPage />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole("button", { name: "Browse listings" }));
  expect(mockNavigate).toHaveBeenCalledWith("/");
});

test("Saved includes item and accommodation links, seller chat, and unsave controls", () => {
  useSavedStore.setState({
    entries: [
      { listingType: "item", listingId: otherItem._id, listing: otherItem },
      {
        listingType: "accommodation",
        listingId: ownAccommodation._id,
        listing: ownAccommodation,
      },
    ],
  });
  render(<SavedPage />);
  expect(screen.getByRole("link", { name: otherItem.title })).toHaveAttribute(
    "href",
    `/products/${otherItem._id}`
  );
  expect(
    screen.getByRole("link", { name: ownAccommodation.title })
  ).toHaveAttribute("href", `/accommodations/${ownAccommodation._id}`);
  expect(screen.getAllByRole("button", { name: "Save" })).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Chat with Seller" }));
  expect(mockNavigate).toHaveBeenCalledWith(`/chat/${userB._id}`);
});

test("a card bookmark saves without navigating to the listing", async () => {
  axiosInstance.put = jest.fn().mockResolvedValue({
    data: {
      listingType: "item",
      listingId: otherItem._id,
      listing: otherItem,
    },
  });
  render(<ItemsPage />);
  const card = screen.getByRole("link", { name: new RegExp(otherItem.title) });
  fireEvent.click(within(card).getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(within(card).getByRole("button", { name: "Save" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
  );
  expect(mockNavigate).not.toHaveBeenCalled();
});

test.each(["item", "accommodation"])(
  "Saved asks before removing %s and Cancel keeps it saved",
  async (listingType) => {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
    };
    const listing = listingType === "item" ? otherItem : ownAccommodation;
    useSavedStore.setState({
      entries: [{ listingType, listingId: listing._id, listing }],
    });
    render(<SavedPage />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      screen.getByRole("dialog", { name: "Remove from Saved?" })
    ).toBeInTheDocument();
    expect(axiosInstance.delete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(useSavedStore.getState().entries).toHaveLength(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
    expect(axiosInstance.delete).toHaveBeenCalledTimes(1);
    expect(useSavedStore.getState().entries).toHaveLength(0);
  }
);
