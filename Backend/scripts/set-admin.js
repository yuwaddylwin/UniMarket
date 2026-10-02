import "dotenv/config";
import mongoose from "mongoose";
import User from "../src/models/user.model.js";
import { ModerationAction } from "../src/models/moderation.model.js";
const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: node scripts/set-admin.js existing-verified-email");
  process.exit(1);
}
try {
  await mongoose.connect(process.env.MONGO_URL);
  await mongoose.connection.transaction(async (session) => {
    const user = await User.findOne({ email }).session(session);
    if (!user?.verified)
      throw new Error(
        "A verified existing account with this email is required. No account was changed."
      );
    if (user.role === "admin") {
      console.log("This account already has administrator access.");
      return;
    }
    user.role = "admin";
    await user.save({ session });
    await ModerationAction.create(
      [
        {
          action: "admin_assigned",
          userId: user._id,
          reason:
            "Administrator access assigned through the authorized server setup process",
        },
      ],
      { session }
    );
    console.log("Administrator access assigned to the verified account.");
  });
} catch (error) {
  console.error(
    error.name === "Error"
      ? error.message
      : "Admin setup failed. Check the server database configuration."
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
