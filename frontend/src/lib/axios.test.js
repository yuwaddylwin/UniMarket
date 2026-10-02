import { validateApiResponse } from "./axios";
jest.mock("axios", () => ({
  create: () => ({
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  }),
}));
test("rejects HTML on API requests regardless of status or content type", () => {
  for (const response of [
    { data: "<!DOCTYPE html><html></html>", headers: {} },
    { data: "SPA", headers: { "content-type": "text/html; charset=utf-8" } },
  ]) {
    expect(() => validateApiResponse(response)).toThrow(/proxy/);
  }
  const response = {
    data: { enabled: true },
    headers: { "content-type": "application/json" },
  };
  expect(validateApiResponse(response)).toBe(response);
});
