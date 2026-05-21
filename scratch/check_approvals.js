const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

async function check() {
  try {
    // Count all statuses
    console.log('=== STATUS DISTRIBUTION ===');
    
    const invStatus = await pool.query('SELECT approval_status, count(*) FROM invoices GROUP BY approval_status');
    console.log('INVOICES by status:', invStatus.rows);
    
    const qtnStatus = await pool.query('SELECT status::text, count(*) FROM quotations GROUP BY status');
    console.log('QUOTATIONS by status:', qtnStatus.rows);
    
    const expStatus = await pool.query('SELECT approval_status, count(*) FROM internal_expenses GROUP BY approval_status');
    console.log('EXPENSES by status:', expStatus.rows);

    // Now test the exact service query for APPROVED status
    console.log('\n=== TESTING SERVICE QUERIES ===');
    
    const invApproved = await pool.query(
      `SELECT 'INVOICE' as type, id, invoice_number as number, total_amount, division as division_id, created_at
       FROM invoices 
       WHERE (TRIM(UPPER(approval_status::text)) = 'APPROVED' OR (approval_status IS NULL AND 'APPROVED' = 'PENDING')) 
       AND (is_deleted = false OR is_deleted IS NULL)`
    );
    console.log('Approved Invoices:', invApproved.rows.length);
    
    const qtnApproved = await pool.query(
      `SELECT 'QUOTATION' as type, id, qtn_number as number, total_amount, division as division_id, created_at
       FROM quotations 
       WHERE (TRIM(UPPER(status::text)) = 'APPROVED' OR (TRIM(UPPER(status::text)) = 'PENDING_APPROVAL' AND 'APPROVED' = 'PENDING'))`
    );
    console.log('Approved Quotations:', qtnApproved.rows.length);
    
    const expPending = await pool.query(
      `SELECT 'EXPENSE' as type, id, category as number, total_amount, 'ALL' as division_id, created_at
       FROM internal_expenses 
       WHERE (TRIM(UPPER(approval_status::text)) = 'PENDING' OR (TRIM(UPPER(approval_status::text)) = 'PENDING_APPROVAL' AND 'PENDING' = 'PENDING')) 
       AND (is_deleted = false OR is_deleted IS NULL)`
    );
    console.log('Pending Expenses:', expPending.rows.length);
    if (expPending.rows.length > 0) console.log(expPending.rows);

  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await pool.end();
  }
}

check();
