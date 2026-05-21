import { pool } from "../../config/db";

export const createPaymentService = async (data: any) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ✅ Normalize fields (frontend/backend mismatch fix)
    const invoiceId = data.invoice_id ?? data.invoiceId;
    const amount = Number(data.amount);
    const method = data.method;

    // ✅ Validation
    if (!invoiceId) throw new Error("invoice_id is required");
    if (!amount || amount <= 0) throw new Error("Valid amount is required");
    if (!method) throw new Error("Payment method is required");

    // 🔍 Get invoice
    const invoiceRes = await client.query(
      `SELECT * FROM invoices WHERE id = $1`,
      [invoiceId]
    );

    if (invoiceRes.rows.length === 0) {
      throw new Error("Invoice not found");
    }

    const invoice = invoiceRes.rows[0];

    // 🚫 Prevent overpayment
    const currentPaid = Number(invoice.amount_paid || 0);
    const totalAmount = Number(invoice.total_amount);

    if (currentPaid + amount > totalAmount) {
      throw new Error("Payment exceeds total invoice amount");
    }

    // 💾 Insert payment
    await client.query(
      `INSERT INTO payments (invoice_id, amount, payment_date, payment_method)
       VALUES ($1, $2, NOW(), $3)`,
      [invoiceId, amount, method]
    );

    // 🧮 Calculate new values
    const newPaid = currentPaid + amount;
    const newBalance = totalAmount - newPaid;

    let status = "UNPAID";
    if (newPaid === 0) status = "UNPAID";
    else if (newPaid < totalAmount) status = "PARTIAL";
    else status = "PAID";

    // 🔄 Update invoice
    await client.query(
      `UPDATE invoices
       SET amount_paid = $1,
           balance_amount = $2,
           status = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [newPaid, newBalance, status, invoiceId]
    );

    await client.query("COMMIT");

    return {
      message: "Payment added successfully",
      status,
      amount_paid: newPaid,
      balance_amount: newBalance,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};