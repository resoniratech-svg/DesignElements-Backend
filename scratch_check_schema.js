const { pool } = require('./src/config/db');

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);
    console.log('USERS COLUMNS:', res.rows);
    
    const clientRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'clients';
    `);
    console.log('CLIENTS COLUMNS:', clientRes.rows);

    const rolesRes = await pool.query(`SELECT * FROM roles;`);
    console.log('ROLES:', rolesRes.rows);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSchema();
