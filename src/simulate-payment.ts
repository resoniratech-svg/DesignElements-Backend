import { pool } from "./config/db";
import { postBalancedLedgerEntry } from "./services/ledger.service";

async function run() {
  const client = await pool.connect();
  try {
    const invoice_id = "INV-1001";
    const amount = 8;
    const method = "Cash";

    console.log("Starting transaction...");
    await client.query("BEGIN");

    console.log("Checking invoice...");
    const invoiceResult = await client.query(
      `SELECT id, client_id, total_amount, amount_paid FROM invoices WHERE invoice_number ILIKE $1`,
      [invoice_id]
    );
    if (invoiceResult.rows.length === 0) throw new Error("Invoice not found");
    const invoice = invoiceResult.rows[0];
    console.log("Found invoice:", invoice.id);

    console.log("Inserting payment...");
    const paymentResult = await client.query(
      `INSERT INTO payments (invoice_id, amount, payment_date, method) VALUES ($1, $2, NOW(), $3) RETURNING *`,
      [invoice.id, amount, method]
    );
    const payment = paymentResult.rows[0];
    console.log("Inserted payment:", payment.id);

    console.log("Updating invoice...");
    const newPaid = Number(invoice.amount_paid || 0) + amount;
    await client.query(
      `UPDATE invoices SET amount_paid = $1 WHERE id = $2`,
      [newPaid, invoice.id]
    );
    console.log("Updated invoice status.");

    console.log("Posting to ledger...");
    await postBalancedLedgerEntry(client, {
      referenceType: 'PAYMENT',
      referenceId: payment.id,
      clientId: invoice.client_id,
      amount
    });
    console.log("Ledger entry OK.");

    await client.query("COMMIT");
    console.log("SUCCESS!");
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("FAILED AT STEP:", err.message);
  } finally {
    client.release();
    process.exit(0);
  }
}
run();
