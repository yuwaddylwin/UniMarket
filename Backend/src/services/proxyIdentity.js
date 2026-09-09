import crypto from 'node:crypto';
import { isIP } from 'node:net';

// The backend is public, so a longer trust-proxy chain alone would let direct
// callers forge client IPs. Only the frontend server can sign this assertion.
export function proxyClientIp(req, secret = process.env.API_PROXY_SECRET) {
  const address = req.headers['x-unimarket-client-ip'];
  const timestamp = req.headers['x-unimarket-proxy-time'];
  const signature = req.headers['x-unimarket-proxy-signature'];
  if (!secret || typeof address !== 'string' || !isIP(address) ||
      typeof timestamp !== 'string' || !/^\d+$/.test(timestamp) || Math.abs(Date.now() - Number(timestamp)) > 120000 ||
      typeof signature !== 'string' || !/^[a-f0-9]{64}$/.test(signature)) return req.ip;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}\n${address}\n${req.method}\n${req.originalUrl}`).digest();
  return crypto.timingSafeEqual(expected, Buffer.from(signature, 'hex')) ? address : req.ip;
}
