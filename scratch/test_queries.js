
const { Client } = require('pg');
const client = new Client({
  user: 'postgres',
  password: 'Akanksha123',
  host: 'localhost',
  database: 'trek_database_restore',
  port: 5432,
});

async function test() {
  try {
    await client.connect();
    console.log("Connected");
    
    const query1 = `
      SELECT 
        e.id,
        e.name,
        e.role,
        e.division as "sector",
        e.joined_date as "startDate",
        e.status,
        COALESCE(u.company_name, e.company) as company
      FROM employees e
      LEFT JOIN users u ON (e.company = u.name OR e.company = u.company_name)
      LEFT JOIN roles r ON u.role_id = r.id AND r.name = 'CLIENT'
    `;
    console.log("Running Query 1...");
    const res1 = await client.query(query1);
    console.log("Query 1 Success, rows:", res1.rows.length);

    const docQuery = `
      SELECT 
        e.id, e.name, e.division as "sector",
        e.qid_number, e.qid_expiry,
        e.passport_number, e.passport_expiry,
        e.joined_date as "startDate",
        e.documents,
        e.role,
        COALESCE(u.company_name, e.company) as company
      FROM employees e
      LEFT JOIN users u ON (e.company = u.name OR e.company = u.company_name)
      LEFT JOIN roles r ON u.role_id = r.id AND r.name = 'CLIENT'
    `;
    console.log("Running Doc Query...");
    const res2 = await client.query(docQuery);
    console.log("Doc Query Success, rows:", res2.rows.length);

  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await client.end();
  }
}

test();
