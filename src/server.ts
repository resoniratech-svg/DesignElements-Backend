import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { pool } from "./config/db";
import { runGhostCleanup } from "./services/ghostCleanup";

// ==============================
// DB CONNECTION CHECK
// ==============================
pool.query("SELECT NOW()")
  .then(async (res) => {
    console.log("✅ [DB CONNECTION SUCCESS] Database Connected Successfully - Testing Auto Build");
    console.log("🚀 [TIMESTAMP]", new Date().toISOString());
    // Safe startup clean-up for legacy ghost accounts (prakash@gmail.com / madhu@gmail.com) on VPS redeployments
    await runGhostCleanup(pool);
  })
  .catch(err => console.error("❌ [DB ERROR]:", err));

// ==============================
// SERVER START
// ==============================
const PORT: number = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`🟢 [SERVER STARTED] Server running on port ${PORT}`);
  console.log(`📅 [STARTUP TIME] ${new Date().toISOString()}`);
});
