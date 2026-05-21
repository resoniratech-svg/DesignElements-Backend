import { pool } from "../db";
import fs from "fs";
import path from "path";

const runMigration = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const sqlPath = path.join(__dirname, "payments_migration.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");

    console.log("Running migration...");
    await client.query(sql);

    await client.query("COMMIT");
    console.log("Migration successful!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
  } finally {
    client.release();
    process.exit(0);
  }
};

runMigration();
