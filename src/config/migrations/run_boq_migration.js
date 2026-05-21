const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

const runMigration = async () => {
    try {
        const sqlPath = path.join(__dirname, "boq_migration.sql");
        const sql = fs.readFileSync(sqlPath, "utf8");
        
        console.log("Running BOQ migration (JS)...");
        await pool.query(sql);
        console.log("BOQ tables created successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
};

runMigration();
