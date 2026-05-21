const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    await client.connect();
    const res = await client.query("SELECT id, name FROM roles");
    console.log("Roles:", res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
