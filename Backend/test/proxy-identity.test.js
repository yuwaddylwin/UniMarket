import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { proxyClientIp } from "../src/services/proxyIdentity.js";
test("proxy rate-limit identity requires a fresh signature bound to the IP, method and path", () => {
  const secret = "isolated-proxy-test-secret-at-least-32";
  const req = {
    ip: "192.0.2.1",
    method: "POST",
    originalUrl: "/api/auth/login",
    headers: {},
  };
  const sign = (time = String(Date.now())) => {
    req.headers = {
      "x-unimarket-client-ip": "198.51.100.2",
      "x-unimarket-proxy-time": time,
      "x-unimarket-proxy-signature": crypto
        .createHmac("sha256", secret)
        .update(`${time}\n198.51.100.2\nPOST\n/api/auth/login`)
        .digest("hex"),
    };
  };
  assert.equal(proxyClientIp(req, secret), req.ip);
  sign();
  assert.equal(proxyClientIp(req, secret), "198.51.100.2");
  req.headers["x-unimarket-client-ip"] = "198.51.100.3";
  assert.equal(proxyClientIp(req, secret), req.ip);
  sign();
  req.originalUrl = "/api/auth/signup";
  assert.equal(proxyClientIp(req, secret), req.ip);
  req.originalUrl = "/api/auth/login";
  sign(String(Date.now() - 180000));
  assert.equal(proxyClientIp(req, secret), req.ip);
  sign();
  assert.equal(proxyClientIp(req, "wrong-secret"), req.ip);
});
