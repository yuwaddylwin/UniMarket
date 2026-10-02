import crypto from "node:crypto";
import User from "../models/user.model.js";
import { validUsername, normalize } from "./authSecurity.js";

// Run with old application writers stopped. Never change IDs or references.
export async function migrateUsernames({ dryRun = false } = {}) {
  const rows = await User.collection
    .find({}, { projection: { username: 1 } })
    .sort({ _id: 1 })
    .toArray();
  // Prefer an already canonical handle when historical mixed-case duplicates exist.
  rows.sort(
    (a, b) =>
      Number(a.username !== normalize(a.username)) -
      Number(b.username !== normalize(b.username))
  );
  const used = new Set(),
    assignments = new Map();
  for (const row of rows) {
    const username = normalize(row.username);
    if (validUsername(username) && !used.has(username)) {
      used.add(username);
      assignments.set(String(row._id), username);
    }
  }
  for (const row of rows) {
    if (assignments.has(String(row._id))) continue;
    let username = `user_${row._id}`,
      attempt = 0;
    while (used.has(username))
      username = `user_${crypto.createHash("sha256").update(`${row._id}:${++attempt}`).digest("hex").slice(0, 24)}`;
    used.add(username);
    assignments.set(String(row._id), username);
  }
  const changes = rows.filter(
    (row) => row.username !== assignments.get(String(row._id))
  );
  if (dryRun) return changes.length;
  // Move invalid/colliding handles first so canonicalization cannot hit the old index.
  changes.sort(
    (a, b) =>
      Number(assignments.get(String(a._id)) === normalize(a.username)) -
      Number(assignments.get(String(b._id)) === normalize(b.username))
  );
  for (const row of changes)
    await User.collection.updateOne(
      { _id: row._id },
      { $set: { username: assignments.get(String(row._id)) } }
    );
  await User.collection.createIndex(
    { username: 1 },
    {
      unique: true,
      name: "username_ci_unique",
      collation: { locale: "en", strength: 2 },
    }
  );
  const usernameValidator = {
    $jsonSchema: {
      bsonType: "object",
      required: ["username"],
      properties: {
        username: { bsonType: "string", pattern: "^[a-z0-9_]{3,30}$" },
      },
    },
  };
  const collection = await User.db.db
    .listCollections({ name: User.collection.name })
    .next();
  const existing = collection?.options?.validator;
  const alreadyInstalled = JSON.stringify(existing || {}).includes(
    "^[a-z0-9_]{3,30}$"
  );
  const validator = alreadyInstalled
    ? existing
    : existing && Object.keys(existing).length
      ? { $and: [existing, usernameValidator] }
      : usernameValidator;
  await User.db.db.command({
    collMod: User.collection.name,
    validator,
    validationLevel: "strict",
    validationAction: "error",
  });
  return changes.length;
}
