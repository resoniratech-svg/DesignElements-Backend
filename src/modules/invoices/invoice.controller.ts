import { Request, Response } from "express";
import { pool } from "../../config/db";
import { success, error } from "../../utils/response";
import { createActivity } from "../activity/activity.service";
import { createNotification } from "../notifications/notifications.service";
import { getNextSequence } from "../../utils/sequenceService";
import { validateCreditLimit } from "../../utils/creditService";
import { createAuditLog } from "../../utils/auditService";
import { AccessGuard } from "../../services/accessGuard.service";

// ==============================
// CONSTANTS
// ==============================
const APPROVAL_THRESHOLD = 50000;

// ==============================
// CREATE INVOICE
// ==============================
export const createInvoice = async (req: any, res: Response) => {
  const client = await pool.connect();
  try {
    let {
      invoice_number,
      division,
      client_id,
      invoice_date,
      due_date,
      total_amount,
      subtotal,
      tax_rate,
      tax_amount,
      discount,
      status,
      approval_status,
      lpo_no,
      salesman,
      qid,
      address,
      client_name,
      project_name,
      ref_type,
      ref_no,
      notes,
      payment_terms,
      items,
      contact_number,
      delivery_note,
      dn_date,
      dn_prepared_by,
      dn_checked_by,
      dn_receiver_name,
      amount_paid,
      balance_amount,
      invoice_type
    } = req.body;

    await client.query("BEGIN");

    // ✅ 1. Document Auto-Numbering ("The Brain")
    if (!invoice_number) {
      invoice_number = await getNextSequence(client, division, "INV");
      console.log(`AUTO-GENERATED INVOICE NUMBER: ${invoice_number}`);
    }

    // ✅ 2. Advanced Credit Control Logic
    let final_approval_status = approval_status || 'approved';
    const creditCheck = await validateCreditLimit(client, Number(client_id), total_amount || 0);
    
    if (creditCheck.isExceeded) {
      final_approval_status = 'pending';
      console.log(`CREDIT LIMIT TRIGGERED: Outstanding balance + Current Invoice exceeds limit. Status set to PENDING.`);
    }

    // ✅ mapping: Ensure client_id points to a record in the 'users' table
    // (Since invoices.client_id has a foreign key to users.id, not clients.id)
    let target_user_id = Number(client_id);
    const userRoleCheck = await client.query(
      `SELECT id FROM users WHERE id = $1 AND role_id = (SELECT id FROM roles WHERE name = 'CLIENT')`,
      [target_user_id]
    );

    if (userRoleCheck.rows.length === 0) {
      // If not a direct user ID, check if it's a client ID from the 'clients' table
      const clientMap = await client.query(`SELECT user_id FROM clients WHERE id = $1`, [target_user_id]);
      if (clientMap.rows.length > 0 && clientMap.rows[0].user_id) {
        target_user_id = clientMap.rows[0].user_id;
        console.log(`[INVOICE_FIX] Mapped Client ID ${client_id} to User ID ${target_user_id}`);
      }
    }

    // Strict Input Validation (Post-Generation)
    const errors = [];
    if (!invoice_number) errors.push("Failed to generate invoice number");
    if (!target_user_id) errors.push("A valid client must be selected");
    if (!invoice_date) errors.push("Invoice date is required");
    if (!due_date) errors.push("Due date is required");
    if (!total_amount) errors.push("Total amount must be calculated");

    if (errors.length > 0) {
      await client.query("ROLLBACK");
      return error(res, `Validation failed: ${errors.join(". ")}`, 400);
    }

    const db_reference_number = ref_no || req.body.reference_number || null;

    const invoiceResult = await client.query(
      `INSERT INTO invoices
       (invoice_number, division, client_id, invoice_date, due_date, total_amount, 
        subtotal, tax_rate, tax_amount, discount, status, approval_status, 
        lpo_no, salesman, qid, address, client_name, ref_type, reference_number, ref_no, project_name, notes, payment_terms,
        amount_paid, balance_amount, manager_id, contact_number, delivery_note, dn_date, dn_prepared_by, dn_checked_by, dn_receiver_name, invoice_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33)
       RETURNING *`,
      [
        invoice_number,
        division,
        target_user_id,
        invoice_date,
        due_date,
        total_amount || 0,
        subtotal || 0,
        tax_rate || 0,
        tax_amount || 0,
        discount || 0,
        status || 'DRAFT',
        final_approval_status,
        lpo_no || null,
        salesman || null,
        qid || null,
        address || null,
        client_name || null,
        ref_type || null,
        db_reference_number,
        db_reference_number, // ref_no
        project_name || null,
        notes || null,
        payment_terms || null,
        amount_paid || 0, // amount_paid
        balance_amount || total_amount || 0, // balance_amount
        req.user.id, // manager_id (auto-assigned to creator)
        contact_number || null,
        delivery_note || null,
        dn_date || null,
        dn_prepared_by || null,
        dn_checked_by || null,
        dn_receiver_name || null,
        invoice_type || 'Credit'
      ]
    );

    const invoiceId = invoiceResult.rows[0].id;

    if (items && Array.isArray(items)) {
      for (const item of items) {
        await client.query(
          `INSERT INTO invoice_items
           (invoice_id, description, quantity, unit_price, total)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            invoiceId,
            item.description,
            item.quantity || 0,
            item.unit_price || 0,
            item.amount || 0
          ]
        );
      }
    }

    // Trigger notification and Audit Log if Credit Limit was triggered
    if (final_approval_status === 'pending' && creditCheck.isExceeded) {
      try {
        await createAuditLog(client, {
          userId: req.user.id,
          action: "CREDIT_OVERRIDE",
          entityType: "INVOICE",
          entityId: invoiceId,
          oldValue: { status: approval_status || 'new' },
          newValue: { status: 'pending', reason: 'Credit Limit Exceeded', ...creditCheck }
        });

         await createNotification({
          user_id: 1, // Notify Admin (ID 1)
          reference_id: invoiceId,
          title: "Credit Limit Approval Required",
          message: `Invoice ${invoice_number} for client ${client_id} exceeds credit limit. Outstanding: ${creditCheck.currentOutstanding}`,
          type: "APPROVAL"
        });
      } catch (notifErr) {
        console.warn("Notification/Audit failed, but invoice was created:", notifErr);
      }
    }

    await client.query("COMMIT");

    await createActivity({
      userId: req.user.id,
      action: "CREATE_INVOICE",
      module: "INVOICE",
      details: { invoice_id: invoiceId, invoice_number }
    });

    return success(res, "Invoice created successfully", invoiceResult.rows[0]);

  } catch (err: any) {
    if (client) await client.query("ROLLBACK");
    console.error("CREATE INVOICE ERROR:", err);
    return error(res, `Database error: ${err.message}`, 500);
  } finally {
    client.release();
  }
};

// ==============================
// GET ALL INVOICES
// ==============================
export const getInvoices = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const division = req.query.division as string;
    const offset = (page - 1) * limit;

    const params: any[] = [];
    let scopedWhere = AccessGuard.getScopedWhere(req.user, params, "i");

    if (division && division !== "all") {
        params.push(division);
        scopedWhere += ` AND UPPER(i.division::TEXT) = UPPER($${params.length})`;
    }

    // Count Query
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM invoices i
      LEFT JOIN users u ON i.client_id = u.id AND u.role_id = (SELECT id FROM roles WHERE name = 'CLIENT')
      ${scopedWhere}
    `;
    const totalRes = await pool.query(countQuery, params);
    const total = parseInt(totalRes.rows[0].count);

    // Data Query
    const query = `
      SELECT i.*, u.name as client_name 
      FROM invoices i
      LEFT JOIN users u ON i.client_id = u.id AND u.role_id = (SELECT id FROM roles WHERE name = 'CLIENT')
      ${scopedWhere}
      ORDER BY i.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return success(res, "Invoices fetched", {
      data: result.rows,
      total,
      page,
      limit
    });

  } catch (err: any) {
    console.error("GET INVOICES ERROR:", err);
    return error(res, err.message, 500);
  }
};

// ==============================
// GET INVOICE BY ID
// ==============================
export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const params: any[] = [id];
    const scopedAnd = AccessGuard.getScopedAnd(req.user, params, "i");

    const invoiceResult = await pool.query(
      `SELECT i.*, u.name as client_name 
       FROM invoices i
       LEFT JOIN users u ON i.client_id = u.id
       WHERE i.id = $1 ${scopedAnd}`,
      params
    );

    if (invoiceResult.rows.length === 0) {
      return error(res, "Invoice not found", 404);
    }

    const items = await pool.query(
      `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id ASC`,
      [id]
    );

    const payments = await pool.query(
      `SELECT * FROM payments WHERE invoice_id = $1 ORDER BY payment_date DESC`,
      [id]
    );

    return success(res, "Invoice details", {
      invoice: invoiceResult.rows[0],
      items: items.rows,
      payments: payments.rows
    });

  } catch (err: any) {
    console.error("GET INVOICE ERROR:", err);
    return error(res, err.message, 500);
  }
};

// ==============================
// UPDATE INVOICE
// ==============================
export const updateInvoice = async (req: any, res: Response) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    const { items, ...headerData } = req.body;

    await client.query("BEGIN");

    // 0. Get old values for Audit
    const oldRes = await client.query(`SELECT * FROM invoices WHERE id = $1`, [id]);
    if (!oldRes.rows.length) return error(res, "Invoice not found", 404);
    const oldInvoice = oldRes.rows[0];

    // Dynamic Header Update
    if (headerData.status) {
      const isPaid = headerData.status.toUpperCase() === "PAID";
      const totalAmt = Number(headerData.total_amount !== undefined ? headerData.total_amount : oldInvoice.total_amount);
      
      if (isPaid) {
        headerData.amount_paid = totalAmt;
        headerData.balance_amount = 0;
      } else {
        // If not PAID, use the provided amount_paid/balance_amount or fallback to old logic
        headerData.amount_paid = headerData.amount_paid !== undefined ? Number(headerData.amount_paid) : 0;
        headerData.balance_amount = headerData.balance_amount !== undefined ? Number(headerData.balance_amount) : totalAmt;
      }
    }

    const fields: string[] = [];
    const values: any[] = [];
    let index = 1;

    Object.keys(headerData).forEach((key) => {
      if (key === 'ref_no' || key === 'reference_number') {
        fields.push(`reference_number = $${index}`);
        fields.push(`ref_no = $${index++}`);
        values.push(headerData[key]);
      } else {
        fields.push(`${key} = $${index++}`);
        values.push(headerData[key]);
      }
    });

    if (fields.length > 0) {
      const query = `
        UPDATE invoices
        SET ${fields.join(", ")}
        WHERE id = $${index}
        RETURNING *
      `;
      values.push(id);
      await client.query(query, values);
    }

    // Sync Items: Delete and Re-insert
    if (items && Array.isArray(items)) {
      await client.query(`DELETE FROM invoice_items WHERE invoice_id = $1`, [id]);
      for (const item of items) {
        await client.query(
          `INSERT INTO invoice_items
           (invoice_id, description, quantity, unit_price, total)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            id,
            item.description,
            item.quantity || 0,
            item.unit_price || 0,
            item.amount || 0
          ]
        );
      }
    }

    // 3. Log Audit if sensitive fields changed
    if (headerData.approval_status && headerData.approval_status !== oldInvoice.approval_status) {
       await createAuditLog(client, {
          userId: req.user.id,
          action: "STATUS_CHANGE",
          entityType: "INVOICE",
          entityId: id,
          oldValue: { approval_status: oldInvoice.approval_status },
          newValue: { approval_status: headerData.approval_status }
       });
    }

    await client.query("COMMIT");

    await createActivity({
      userId: req.user.id,
      action: "UPDATE_INVOICE",
      module: "INVOICE",
      details: { invoice_id: id }
    });

    const result = await pool.query("SELECT * FROM invoices WHERE id = $1", [id]);
    return success(res, "Invoice updated", result.rows[0]);

  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("UPDATE INVOICE ERROR:", err);
    return error(res, err.message, 500);
  } finally {
    client.release();
  }
};

// ==============================
// DELETE INVOICE
// ==============================
export const deleteInvoice = async (req: any, res: Response) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);

    await client.query("BEGIN");

    // Delete dependent records first to handle foreign key constraints
    await client.query(`DELETE FROM invoice_items WHERE invoice_id = $1`, [id]);
    await client.query(`DELETE FROM payments WHERE invoice_id = $1`, [id]);

    // Now delete the invoice itself
    const result = await client.query(`DELETE FROM invoices WHERE id = $1 RETURNING id`, [id]);
    
    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return error(res, "Invoice not found", 404);
    }

    try {
        await createActivity({
        userId: req.user.id,
        action: "DELETE_INVOICE",
        module: "INVOICE",
        details: { invoice_id: id }
        });
    } catch (actErr) {
        console.warn("Activity logging failed during delete_invoice, ignoring.", actErr);
    }

    await client.query("COMMIT");
    return success(res, "Invoice deleted");

  } catch (err: any) {
    if (client) await client.query("ROLLBACK");
    console.error("DELETE INVOICE ERROR:", err);
    return error(res, err.message, 500);
  } finally {
    client.release();
  }
};

// ==============================
// RESTORE INVOICE
// ==============================
export const restoreInvoice = async (req: any, res: Response) => {
  return success(res, "Restore not implemented yet");
};

// ==============================
// UPDATE STATUS
// ==============================
export const updateInvoiceStatus = async (req: any, res: Response) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    await client.query("BEGIN");

    const oldRes = await client.query(`SELECT status, total_amount FROM invoices WHERE id = $1`, [id]);
    if (!oldRes.rows.length) return error(res, "Invoice not found", 404);
    const oldStatus = oldRes.rows[0].status;
    const totalAmount = Number(oldRes.rows[0].total_amount || 0);

    let amount_paid = 0;
    let balance_amount = totalAmount;

    if (status.toUpperCase() === "PAID") {
      amount_paid = totalAmount;
      balance_amount = 0;
    }

    const result = await client.query(
      `UPDATE invoices SET status = $1, amount_paid = $2, balance_amount = $3 WHERE id = $4 RETURNING *`,
      [status, amount_paid, balance_amount, id]
    );

    // Audit Log
    if (status !== oldStatus) {
       await createAuditLog(client, {
          userId: req.user.id,
          action: "PAYMENT_STATUS_CHANGE",
          entityType: "INVOICE",
          entityId: id,
          oldValue: { status: oldStatus },
          newValue: { status: status, amount_paid, balance_amount }
       });
    }

    await client.query("COMMIT");
    return success(res, "Status updated", result.rows[0]);

  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("STATUS UPDATE ERROR:", err);
    return error(res, err.message, 500);
  } finally {
    client.release();
  }
};

// ==============================
// GET OVERDUE INVOICES (FIXED)
// ==============================
export const getOverdueInvoices = async (req: Request, res: Response) => {
  try {
    console.log("QUERY:", req.query);

    const daysRaw = req.query.days;
    const days = daysRaw ? Number(daysRaw) : 0;

    if (isNaN(days)) {
      return res.status(400).json({
        success: false,
        message: "days must be a valid number",
      });
    }

    const params: any[] = [days];
    const scopedAnd = AccessGuard.getScopedAnd(req.user, params, "i");

    const result = await pool.query(
      `SELECT * FROM invoices 
       WHERE due_date < NOW() - ($1 * INTERVAL '1 day') ${scopedAnd}`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
    });

  } catch (err) {
    console.error("GET INVOICE ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch overdue invoices",
    });
  }
};

// ==============================
// EXPORT INVOICES
// ==============================
export const exportInvoices = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`SELECT * FROM invoices`);

    const rows = result.rows;

    if (!rows.length) {
      return error(res, "No data", 404);
    }

    const headers = Object.keys(rows[0]).join(",");
    const csv = [
      headers,
      ...rows.map(r => Object.values(r).join(","))
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=invoices.csv");

    return res.send(csv);

  } catch (err: any) {
    console.error("EXPORT ERROR:", err);
    return error(res, err.message, 500);
  }
};

// ==============================
// SEND REMINDER
// ==============================
export const sendReminder = async (req: any, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice id"
      });
    }

    const invoiceResult = await pool.query(
      `SELECT * FROM invoices WHERE id = $1`,
      [id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found"
      });
    }

    const invoice = invoiceResult.rows[0];

    await createNotification({
      user_id: invoice.client_id,
      reference_id: invoice.id,
      title: "Payment Reminder",
      message: `Reminder: Invoice ${invoice.invoice_number} is overdue`,
      type: "REMINDER"
    });

    return res.status(200).json({
      success: true,
      message: "Reminder sent successfully"
    });

  } catch (err: any) {
    console.error("REMINDER ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error"
    });
  }
};