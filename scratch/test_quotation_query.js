const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'trek_database_d',
  password: 'Akanksha123',
  port: 5433,
});

async function checkQuotations() {
  try {
    const res = await pool.query(`
      SELECT * FROM quotations q WHERE UPPER(q.division::TEXT) = 'CONTRACTING'
    `);
    console.log('Quotations using UPPER(q.division::TEXT): Success', res.rows.length);

    try {
        const res2 = await pool.query(`
          SELECT * FROM quotations q WHERE UPPER(q.division) = 'CONTRACTING'
        `);
        console.log('Quotations using UPPER(q.division): Success', res2.rows.length);
    } catch (e) {
        console.error('Error with UPPER(q.division):', e.message);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkQuotations();
