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
    console.log("Connected to database");
    
    // Invoices
    const invoices = await client.query("SELECT id, invoice_number, invoice_date, total_amount, approval_status FROM invoices");
    console.log("\n--- INVOICES ---");
    invoices.rows.forEach(r => {
      console.log(`ID: ${r.id}, Number: ${r.invoice_number}, Date: ${r.invoice_date}, Amount: ${r.total_amount}, Status: ${r.approval_status}`);
    });
    
    // Expenses
    const expenses = await client.query("SELECT id, amount, total_amount, date, created_at, approval_status FROM expenses");
    console.log("\n--- EXPENSES ---");
    expenses.rows.forEach(r => {
      console.log(`ID: ${r.id}, Date: ${r.date}, Created: ${r.created_at}, Amount: ${r.amount || r.total_amount}, Status: ${r.approval_status}`);
    });
    
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
