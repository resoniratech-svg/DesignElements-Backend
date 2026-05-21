import pool from "../src/config/db";
import bcrypt from "bcrypt";

async function main() {
  try {
    const hashedPassword = await bcrypt.hash("123456", 10);
    const { rowCount } = await pool.query(
      "UPDATE users SET password_hash = $1 WHERE email = 'prakash@gmail.com'",
      [hashedPassword]
    );
    console.log(`Updated password for ${rowCount} user(s).`);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
main();
