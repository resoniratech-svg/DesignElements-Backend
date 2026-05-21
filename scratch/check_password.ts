import pool from "../src/config/db";
import bcrypt from "bcrypt";

async function main() {
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email = 'prakash@gmail.com'");
    if (rows.length === 0) {
      console.log("No user found");
      return;
    }
    const user = rows[0];
    const isMatch = await bcrypt.compare("123456", user.password_hash);
    console.log("Password match:", isMatch);
    console.log("User:", user);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
main();
