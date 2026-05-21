const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'trek_database_d',
  password: 'Akanksha123',
  port: 5433,
});

async function checkClient() {
  const res = await pool.query(`
    SELECT c.id, c.name, u.qid_doc_url, u.cr_doc_url, u.computer_card_doc_url, u.contract_doc_url
    FROM clients c
    LEFT JOIN users u ON c.user_id = u.id
    ORDER BY c.id DESC
    LIMIT 1
  `);
  console.log('Client Fields:', JSON.stringify(res.rows[0], null, 2));

  if (res.rows[0]) {
    const licenses = await pool.query('SELECT license_name, document_url FROM client_licenses WHERE client_id = $1', [res.rows[0].id]);
    console.log('Licenses:', JSON.stringify(licenses.rows, null, 2));

    const agreements = await pool.query('SELECT title, file_url FROM client_agreements WHERE client_id = $1', [res.rows[0].id]);
    console.log('Agreements:', JSON.stringify(agreements.rows, null, 2));
  }
  process.exit(0);
}

checkClient().catch(err => {
    console.error(err);
    process.exit(1);
});
