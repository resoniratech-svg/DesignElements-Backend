const { Client } = require('pg');
const bcrypt = require('bcrypt');

const client = new Client({
  user: 'postgres',
  password: 'root',
  host: '127.0.0.1',
  port: 5433,
  database: 'erp_backend_restored'
});

async function resetPassword() {
  try {
    await client.connect();
    
    // Hash the user's desired password "Admin@123"
    const newHash = await bcrypt.hash('Admin@123', 10);
    
    // Update the DB
    const res = await client.query(
      `UPDATE users SET password_hash = $1 WHERE email = 'admin@erp.com' RETURNING *`,
      [newHash]
    );
    
    if (res.rows.length > 0) {
      console.log('Successfully updated password for admin@erp.com to Admin@123');
    } else {
      console.log('User admin@erp.com not found');
    }
  } catch (err) {
    console.error('Error updating password:', err);
  } finally {
    await client.end();
  }
}

resetPassword();
