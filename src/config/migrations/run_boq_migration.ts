import { pool } from "../db";
import fs from "fs";
import path from "path";

const runMigration = async () => {
    try {
        const sqlPath = path.join(__dirname, "boq_migration.sql");
        const sql = fs.readFileSync(sqlPath, "utf8");
        
        console.log("Running BOQ migration...");
        await pool.query(sql);
        console.log("BOQ tables created successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
};

runMigration();
