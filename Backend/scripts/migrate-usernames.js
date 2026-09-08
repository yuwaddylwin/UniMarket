import 'dotenv/config';
import mongoose from 'mongoose';
import { migrateUsernames } from '../src/services/usernameMigration.js';
try {
  await mongoose.connect(process.env.MONGO_URL, { autoIndex: false });
  const dryRun = !process.argv.includes('--apply');
  const count = await migrateUsernames({ dryRun });
  console.log(`${dryRun ? 'Dry run: accounts needing migration' : 'Accounts migrated'}: ${count}`);
} catch (error) { console.error('Username migration failed:', error.name); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
