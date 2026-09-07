import fs from 'node:fs';
import webpush from 'web-push';
import dotenv from 'dotenv';
const file = new URL('../.env', import.meta.url);
const contents = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const config = dotenv.parse(contents);
if (config.VAPID_PUBLIC_KEY && config.VAPID_PRIVATE_KEY) {
  console.log('Existing VAPID keys retained. No keys were changed.');
} else if (config.VAPID_PUBLIC_KEY || config.VAPID_PRIVATE_KEY) {
  console.error('Only one VAPID key is configured. Restore its matching key before continuing; existing keys were not replaced.');
  process.exitCode = 1;
} else {
  const keys = webpush.generateVAPIDKeys();
  const lines = [`VAPID_PUBLIC_KEY=${keys.publicKey}`, `VAPID_PRIVATE_KEY=${keys.privateKey}`];
  if (!config.VAPID_SUBJECT) lines.push('VAPID_SUBJECT=mailto:unimarket.app.official@gmail.com');
  fs.writeFileSync(file, `${contents.trimEnd()}\n\n# Browser push credentials: keep the private key secret and stable across deployments.\n${lines.join('\n')}\n`, { mode: 0o600 });
  console.log('VAPID keys saved to the ignored Backend/.env file. Restart the backend to enable Web Push.');
}
