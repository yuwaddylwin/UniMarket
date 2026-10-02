import { act, renderHook, waitFor } from "@testing-library/react";
import { axiosInstance } from "../lib/axios";
import { useItemsList } from "./useItemsList";
import { useAccommodations } from "./useAccommodations";

jest.mock("../lib/axios", () => ({ axiosInstance: { get: jest.fn() } }));

beforeEach(() => axiosInstance.get.mockReset());

test.each([
  [useItemsList, "/items", "items", "Untitled"],
  [
    useAccommodations,
    "/accommodations",
    "accommodations",
    "Untitled accommodation",
  ],
])(
  "listing hooks keep their endpoints, response envelopes and defaults",
  async (useListings, endpoint, key, title) => {
    axiosInstance.get.mockResolvedValue({
      data: {
        [key]: [{ _id: "listing", user: "owner", images: ["image.jpg"] }],
      },
    });
    const { result } = renderHook(useListings);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(axiosInstance.get).toHaveBeenCalledWith(endpoint, {
      signal: expect.any(AbortSignal),
    });
    expect(result.current[key][0]).toMatchObject({
      title,
      seller: { id: "owner" },
      images: ["image.jpg"],
    });
  }
);

test("refetch aborts the old request and ignores a stale success arriving afterward", async () => {
  let resolveOld;
  axiosInstance.get
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        })
    )
    .mockResolvedValueOnce({ data: [{ _id: "new" }] });
  const { result, unmount } = renderHook(useItemsList);
  const oldSignal = axiosInstance.get.mock.calls[0][1].signal;
  await act(async () => {
    await result.current.refetch();
  });
  expect(oldSignal.aborted).toBe(true);
  await act(async () => {
    resolveOld({ data: [{ _id: "old" }] });
  });
  expect(result.current.items.map((item) => item._id)).toEqual(["new"]);
  expect(result.current.loading).toBe(false);
  const currentSignal = axiosInstance.get.mock.calls[1][1].signal;
  unmount();
  expect(currentSignal.aborted).toBe(true);
});

test("failed refetch keeps existing records and surfaces the original server message", async () => {
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  axiosInstance.get
    .mockResolvedValueOnce({ data: [{ _id: "existing" }] })
    .mockRejectedValueOnce({
      response: { data: { message: "Service unavailable" } },
    });
  try {
    const { result } = renderHook(useAccommodations);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.error).toBe("Service unavailable");
    expect(result.current.accommodations.map((item) => item._id)).toEqual([
      "existing",
    ]);
    expect(result.current.isLoading).toBe(false);
  } finally {
    log.mockRestore();
  }
});
