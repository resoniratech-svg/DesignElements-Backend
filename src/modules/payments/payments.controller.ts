import { Request, Response } from "express";
import { pool } from "../../config/db";
import { success, error } from "../../utils/response";
import { createNotification } from "../notifications/notifications.service";
import { createActivity } from "../activity/activity.service";
import { postBalancedLedgerEntry } from "../../services/ledger.service";

// ==============================
// CREATE PAYMENT
// ==============================
export const createPayment = async (req: any, res: Response) => {
  const client = await pool.connect();

  try {
    const invoice_id = req.body.invoice_id ?? req.body.invoiceId;
    const amount = Number(req.body.amount);
    const method = req.body.method;
    const notes = req.body.notes || null;

    if (!invoice_id) return error(res, "invoice_id is required", 400);
    if (!amount || amount <= 0)
      return error(res, "Valid amount is required", 400);

    await client.query("BEGIN");

    const isStringParam = isNaN(Number(invoice_id));

    const invoiceResult = await client.query(
      `SELECT id, client_id, total_amount, amount_paid, division
       FROM invoices
       WHERE ${isStringParam ? "invoice_number ILIKE $1" : "id = $1"}`,
      [isStringParam ? String(invoice_id) : Number(invoice_id)]
    );

    if (invoiceResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return error(res, `Invoice '${invoice_id}' not found. Please check the invoice number.`, 404);
    }

    const invoice = invoiceResult.rows[0];
    const real_invoice_id = invoice.id;

    const currentPaid = Number(invoice.amount_paid || 0);
    const totalAmount = Number(invoice.total_amount);

    if (currentPaid + amount > totalAmount) {
      await client.query("ROLLBACK");
      return error(res, "Payment exceeds invoice amount", 400);
    }

    const paymentResult = await client.query(
      `INSERT INTO payments (invoice_id, amount, payment_date, payment_method, notes, division)
       VALUES ($1, $2, NOW(), $3, $4, $5)
       RETURNING *`,
      [real_invoice_id, amount, method, notes, (invoice.division || req.body.division || 'CONTRACTING').toUpperCase()]
    );

    const payment = paymentResult.rows[0];

    const newPaid = currentPaid + amount;
    const newBalance = totalAmount - newPaid;

    let status = "UNPAID";
    if (newPaid === 0) status = "UNPAID";
    else if (newPaid < totalAmount) status = "PARTIAL";
    else status = "PAID";

    await client.query(
      `UPDATE invoices
       SET amount_paid = $1,
           balance_amount = $2,
           status = $3
       WHERE id = $4`,
      [newPaid, newBalance, status, real_invoice_id]
    );

    // Rule 1 + 4: Balanced double-entry — both rows inside the transaction
    const clientCheckResult = await client.query(`SELECT id FROM clients WHERE id = $1`, [invoice.client_id]);
    const validClientId = clientCheckResult.rows.length > 0 ? invoice.client_id : null;
    
    if (!validClientId) {
       console.warn(`[WARNING] Payment recorded for orphaned invoice. Client ID ${invoice.client_id} not found.`);
    }

    await postBalancedLedgerEntry(client, {
      referenceType: 'PAYMENT',
      referenceId: payment.id,
      clientId: validClientId,
      amount
    });

    await client.query("COMMIT");

    // ✅ ONLY FIX: moved after commit
    await createActivity({
  userId: req.user.id,
  action: "CREATE_PAYMENT",
  module: "CREDIT_CONTROL",
  entityId: String(payment.id),
  entityType: "PAYMENT",
  details: {
    invoiceId: payment.invoice_id,
    amount: payment.amount
  },
  ipAddress: req.ip,
  userAgent: req.headers["user-agent"]
});

    await createNotification({
      user_id: invoice.client_id,
      title: "Payment Received",
      message: `₹${amount} received for Invoice #${invoice_id}`,
      type: "PAYMENT",
      reference_id: real_invoice_id
    });

    return success(res, "Payment recorded successfully", {
      payment,
      status,
      amount_paid: newPaid,
      balance_amount: newBalance
    });

  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("CREATE PAYMENT ERROR:", err);
    console.error("ERROR DETAILS:", {
      code: err.code,
      detail: err.detail,
      table: err.table,
      constraint: err.constraint
    });

    return error(res, err.message || "Internal Server Error", 500);

  } finally {
    client.release();
  }
};

// ==============================
// GET PAYMENTS BY INVOICE
// ==============================
// ==============================
// GET PAYMENTS BY INVOICE (FIXED)
// ==============================
export const getPaymentsByInvoice = async (req: Request, res: Response) => {
  try {
    const invoice_id = req.params.invoice_id;

    if (!invoice_id) {
      return error(res, "invoice_id is required", 400);
    }

    const result = await pool.query(
      `SELECT *
       FROM payments
       WHERE invoice_id = $1
       AND is_deleted = false
       ORDER BY payment_date DESC`,
      [invoice_id]
    );

    return success(res, "Payments fetched successfully", result.rows);

  } catch (err) {
    console.error(err);
    return error(res, "Server error", 500);
  }
};


// ==============================
// DELETE PAYMENT (PRODUCTION SAFE)
// ==============================
export const deletePayment = async (req: any, res: Response) => {
  const client = await pool.connect();

  try {
    const paymentId = Number(req.params.id);

    if (!paymentId) {
      return error(res, "Invalid payment id", 400);
    }

    await client.query("BEGIN");

    // 🔹 1. Get payment details
    const paymentResult = await client.query(
      `SELECT * FROM payments WHERE id = $1 AND is_deleted = false`,
      [paymentId]
    );

    if (paymentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return error(res, "Payment not found", 404);
    }

    const payment = paymentResult.rows[0];

    // 🔹 2. Get invoice details
    const invoiceResult = await client.query(
      `SELECT id, total_amount, amount_paid
       FROM invoices
       WHERE id = $1`,
      [payment.invoice_id]
    );

    const invoice = invoiceResult.rows[0];

    if (!invoice) {
      await client.query("ROLLBACK");
      return error(res, "Invoice not found", 404);
    }

    const currentPaid = Number(invoice.amount_paid || 0);
    const totalAmount = Number(invoice.total_amount);

    // 🔹 3. Recalculate amounts
    const newPaid = currentPaid - Number(payment.amount);
    const safePaid = newPaid < 0 ? 0 : newPaid;
    const newBalance = totalAmount - safePaid;

    let status = "PENDING";
    if (safePaid === 0) status = "PENDING";
    else if (safePaid < totalAmount) status = "PARTIAL";
    else status = "PAID";

    // 🔹 4. Soft delete payment
    await client.query(
      `UPDATE payments
       SET is_deleted = true
       WHERE id = $1`,
      [paymentId]
    );

    // 🔹 5. Update invoice
    await client.query(
      `UPDATE invoices
       SET amount_paid = $1,
           balance_amount = $2,
           status = $3
       WHERE id = $4`,
      [safePaid, newBalance, status, payment.invoice_id]
    );

    // 🔹 6. Reverse ledger entry — balanced double-entry reversal
    const clientCheckResult = await client.query(`SELECT id FROM clients WHERE id = $1`, [payment.client_id]);
    const validClientId = clientCheckResult.rows.length > 0 ? payment.client_id : null;
    
    await postBalancedLedgerEntry(client, {
      referenceType: 'PAYMENT_REVERSAL',
      referenceId: paymentId,
      clientId: validClientId,
      amount: Number(payment.amount)
    });

    await client.query("COMMIT");

    // 🔹 7. Activity Log (AFTER COMMIT)
    await createActivity({
      userId: req.user.id,
      action: "DELETE_PAYMENT",
      module: "CREDIT_CONTROL",
      entityId: String(payment.id),
      entityType: "PAYMENT",
      details: {
        invoiceId: payment.invoice_id,
        amount: payment.amount
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });

    return success(res, "Payment deleted and invoice updated successfully", {
      payment_id: paymentId,
      updated_status: status,
      amount_paid: safePaid,
      balance_amount: newBalance
    });

  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("DELETE PAYMENT ERROR:", err);

    return error(res, err.message || "Internal Server Error", 500);

  } finally {
    client.release();
  }
};


// ==============================
// UPDATE PAYMENT (PRODUCTION SAFE)
// ==============================
export const updatePayment = async (req: any, res: Response) => {
  const client = await pool.connect();

  try {
    const paymentId = Number(req.params.id);

    if (!paymentId) {
      return error(res, "Invalid payment id", 400);
    }

    const newAmount = req.body.amount ? Number(req.body.amount) : null;
    const newMethod = req.body.method || null;
    const newNotes = req.body.notes || null;

    if (newAmount !== null && newAmount <= 0) {
      return error(res, "Amount must be greater than 0", 400);
    }

    await client.query("BEGIN");

    // 🔹 1. Get existing payment
    const paymentResult = await client.query(
      `SELECT * FROM payments WHERE id = $1 AND is_deleted = false`,
      [paymentId]
    );

    if (paymentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return error(res, "Payment not found", 404);
    }

    const payment = paymentResult.rows[0];

    // 🔹 2. Get invoice
    const invoiceResult = await client.query(
      `SELECT id, total_amount, amount_paid
       FROM invoices
       WHERE id = $1`,
      [payment.invoice_id]
    );

    const invoice = invoiceResult.rows[0];

    if (!invoice) {
      await client.query("ROLLBACK");
      return error(res, "Invoice not found", 404);
    }

    const currentPaid = Number(invoice.amount_paid || 0);
    const totalAmount = Number(invoice.total_amount);

    // 🔹 3. Calculate difference
    const oldAmount = Number(payment.amount);
    const updatedAmount = newAmount !== null ? newAmount : oldAmount;

    const adjustedPaid = currentPaid - oldAmount + updatedAmount;

    if (adjustedPaid > totalAmount) {
      await client.query("ROLLBACK");
      return error(res, "Updated amount exceeds invoice total", 400);
    }

    const newBalance = totalAmount - adjustedPaid;

    let status = "PENDING";
    if (adjustedPaid === 0) status = "PENDING";
    else if (adjustedPaid < totalAmount) status = "PARTIAL";
    else status = "PAID";

    // 🔹 4. Update payment
    const updatedPaymentResult = await client.query(
      `UPDATE payments
       SET amount = $1,
           payment_method = COALESCE($2, payment_method),
           notes = COALESCE($3, notes)
       WHERE id = $4
       RETURNING *`,
      [updatedAmount, newMethod, newNotes, paymentId]
    );

    const updatedPayment = updatedPaymentResult.rows[0];

    // 🔹 5. Update invoice
    await client.query(
      `UPDATE invoices
       SET amount_paid = $1,
           balance_amount = $2,
           status = $3
       WHERE id = $4`,
      [adjustedPaid, newBalance, status, payment.invoice_id]
    );

    // 🔹 6. Ledger adjustment — balanced reversal of old + balanced new entry
    const clientCheckResult = await client.query(`SELECT id FROM clients WHERE id = $1`, [payment.client_id]);
    const validClientId = clientCheckResult.rows.length > 0 ? payment.client_id : null;

    await postBalancedLedgerEntry(client, {
      referenceType: 'PAYMENT_UPDATE_REVERSAL',
      referenceId: paymentId,
      clientId: validClientId,
      amount: oldAmount
    });

    await postBalancedLedgerEntry(client, {
      referenceType: 'PAYMENT_UPDATED',
      referenceId: paymentId,
      clientId: validClientId,
      amount: updatedAmount
    });

    await client.query("COMMIT");

    // 🔹 7. Activity Log (AFTER COMMIT)
    await createActivity({
      userId: req.user.id,
      action: "UPDATE_PAYMENT",
      module: "CREDIT_CONTROL",
      entityId: String(payment.id),
      entityType: "PAYMENT",
      details: {
        invoiceId: payment.invoice_id,
        oldAmount,
        newAmount: updatedAmount
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });

    return success(res, "Payment updated successfully", {
      payment: updatedPayment,
      updated_status: status,
      amount_paid: adjustedPaid,
      balance_amount: newBalance
    });

  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("UPDATE PAYMENT ERROR:", err);

    return error(res, err.message || "Internal Server Error", 500);

  } finally {
    client.release();
  }
};

// ==============================
// GET ALL PAYMENTS (PRODUCTION READY)
// ==============================
export const getAllPayments = async (req: Request, res: Response) => {
  try {
    const {
      search = "",
      invoiceId,
      method,
      fromDate,
      toDate,
      page = "1",
      limit = "10"
    } = req.query as any;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const offset = (pageNumber - 1) * limitNumber;

    let conditions: string[] = ["p.is_deleted = false"];
    let values: any[] = [];
    let index = 1;

    // 🔹 Search (invoice_id)
    if (search) {
      conditions.push(`CAST(invoice_id AS TEXT) ILIKE $${index++}`);
      values.push(`%${search}%`);
    }

    // 🔹 Filter: invoiceId
    if (invoiceId) {
      conditions.push(`invoice_id = $${index++}`);
      values.push(invoiceId);
    }

    // 🔹 Filter: method
    if (method) {
      conditions.push(`payment_method = $${index++}`);
      values.push(method);
    }

    // 🔹 Filter: date range
    if (fromDate) {
      conditions.push(`payment_date >= $${index++}`);
      values.push(fromDate);
    }

    if (toDate) {
      conditions.push(`payment_date <= $${index++}`);
      values.push(toDate);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // ✅ Total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM payments p ${whereClause}`,
      values
    );

    const total = Number(countResult.rows[0].count);

    // ✅ Fetch data
    const result = await pool.query(
       `SELECT p.*, i.invoice_number, i.client_name as explicit_client_name, u.name as user_client_name
       FROM payments p
       LEFT JOIN invoices i ON p.invoice_id = i.id
       LEFT JOIN clients c ON i.client_id = c.id
       LEFT JOIN users u ON i.client_id = u.id OR c.user_id = u.id
       ${whereClause}
       ORDER BY p.payment_date DESC, p.created_at DESC
       LIMIT $${index++} OFFSET $${index++}`,
      [...values, limitNumber, offset]
    );

    return success(res, "Payments fetched successfully", {
      data: result.rows,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber)
      }
    });

  } catch (err) {
    console.error("GET PAYMENTS ERROR:", err);
    return error(res, "Server error", 500);
  }
};