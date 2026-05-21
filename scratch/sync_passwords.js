const { Client } = require('pg');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to", process.env.DATABASE_URL);
    
    // Fetch all users
    const res = await client.query("SELECT id, email, password_plain, password_hash FROM users");
    console.log(`Found ${res.rows.length} users.`);
    
    for (const user of res.rows) {
      const plain = user.password_plain;
      const hash = user.password_hash;
      
      if (!plain) {
        console.log(`User ${user.email} has no plain text password. Skipping.`);
        continue;
      }
      
      // Verify if hash matches plain text
      let isMatch = false;
      if (hash) {
        try {
          isMatch = await bcrypt.compare(plain, hash);
        } catch (e) {
          console.log(`Error comparing hash for ${user.email}:`, e.message);
        }
      }
      
      if (!isMatch) {
        console.log(`Updating hash for ${user.email} since it does not match plain text '${plain}'`);
        const newHash = await bcrypt.hash(plain, 10);
        await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, user.id]);
        console.log(`Successfully updated ${user.email} password hash to match '${plain}'`);
      } else {
        console.log(`User ${user.email} hash matches plain text '${plain}'`);
      }
    }
  } catch (err) {
    console.error("Error during sync:", err);
  } finally {
    await client.end();
  }
}

run();
