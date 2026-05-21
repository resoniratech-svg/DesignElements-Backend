const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

async function check() {
  try {
    const id = 31;
    console.log('Testing GET client by ID:', id);
    const clientRes = await pool.query(
    `SELECT c.*, 
            u.qid, u.cr_number, u.computer_card, 
            u.start_date, u.renewal_date, u.contract_type,
            u.company_name as user_company_name,
            u.qid_doc_url, u.cr_doc_url, u.computer_card_doc_url, u.contract_doc_url
     FROM clients c
     LEFT JOIN users u ON c.user_id = u.id
     WHERE c.id = $1`,
    [id]
    );
    console.log('RESULT:', clientRes.rows[0]);
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await pool.end();
  }
}

check();
