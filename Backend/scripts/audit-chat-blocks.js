import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({
  path: new URL("../.env", import.meta.url).pathname,
  quiet: true,
});
try {
  if (!process.env.MONGO_URL) throw new Error("MONGO_URL is not configured");
  await mongoose.connect(process.env.MONGO_URL, {
    serverSelectionTimeoutMS: 5000,
  });
  const collection = mongoose.connection.collection("users");
  const users = await collection
    .find({}, { projection: { _id: 1, blockedUsers: 1 } })
    .toArray();
  const ids = new Set(users.map((u) => String(u._id)));
  const summary = {
    users: users.length,
    relationships: 0,
    missing: 0,
    nullLists: 0,
    malformedLists: 0,
    invalidEntries: 0,
    duplicates: 0,
    selfBlocks: 0,
    deletedTargets: 0,
  };
  for (const user of users) {
    if (user.blockedUsers === undefined) {
      summary.missing++;
      continue;
    }
    if (user.blockedUsers === null) {
      summary.nullLists++;
      continue;
    }
    if (!Array.isArray(user.blockedUsers)) {
      summary.malformedLists++;
      continue;
    }
    const seen = new Set();
    for (const value of user.blockedUsers) {
      if (!mongoose.isObjectIdOrHexString(value)) {
        summary.invalidEntries++;
        continue;
      }
      const id = String(value);
      summary.relationships++;
      if (seen.has(id)) summary.duplicates++;
      seen.add(id);
      if (id === String(user._id)) summary.selfBlocks++;
      if (!ids.has(id)) summary.deletedTargets++;
    }
  }
  console.log(JSON.stringify(summary));
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  console.log(
    JSON.stringify({
      transactionsSupported: Boolean(hello.setName || hello.msg === "isdbgrid"),
    })
  );
} catch (error) {
  console.error(
    "Read-only block audit failed:",
    error.name,
    error.code || "connection/configuration unavailable"
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
