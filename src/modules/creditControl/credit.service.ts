import { pool } from "../../config/db";
import { Invoice, InvoiceStatus } from "../../types/erp";
import { postBalancedLedgerEntry } from "../../services/ledger.service";

export const getCreditSummaryService = async (divisionId?: string) => {
  const whereClause = divisionId ? "WHERE i.division = $1" : "";
  const params = divisionId ? [divisionId] : [];

  const result = await pool.query(`
    SELECT
      COALESCE(SUM(i.total_amount), 0) AS total_invoiced,
      COALESCE(SUM(i.amount_paid), 0) AS total_collected,
      COALESCE(SUM(i.balance_amount), 0) AS pending_payments,
      COUNT(*) FILTER (WHERE (i.balance_amount > 0 AND i.due_date < CURRENT_DATE) OR UPPER(i.status) = 'DUE') AS overdue_count,
      COALESCE(SUM(i.balance_amount) FILTER (WHERE (i.balance_amount > 0 AND i.due_date < CURRENT_DATE) OR UPPER(i.status) = 'DUE'), 0) AS due_amount
    FROM invoices i
    ${whereClause}
  `, params);

  const row = result.rows[0];
  return {
    totalInvoiced: Number(row.total_invoiced),
    totalCollected: Number(row.total_collected),
    pendingPayments: Number(row.pending_payments),
    overdueCount: Number(row.overdue_count),
    dueAmount: Number(row.due_amount),
  };
};

export const getInvoicesService = async (filters: any, divisionId?: string) => {
  const { status, search, page = 1, limit = 10 } = filters;
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT i.*, u.name as client_name 
    FROM invoices i
    LEFT JOIN users u ON i.client_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  const effectiveDivision = divisionId || filters.division;
  if (effectiveDivision) {
    params.push(effectiveDivision);
    query += ` AND i.division = $${params.length}`;
  }

  if (status) {
    if (status.toUpperCase() === 'PENDING') {
      query += ` AND i.balance_amount > 0`;
    } else if (status.toUpperCase() === 'DUE') {
      query += ` AND i.balance_amount > 0 AND i.due_date < CURRENT_DATE`;
    } else if (status.toUpperCase() === 'PAID') {
      query += ` AND i.balance_amount = 0`;
    } else {
      params.push(status);
      query += ` AND UPPER(i.status) = $${params.length}`;
    }
  }

  if (search) {
    params.push(`%${search}%`);
    query += ` AND (i.invoice_number ILIKE $${params.length} OR u.name ILIKE $${params.length})`;
  }

  query += ` ORDER BY i.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit ?? 10, offset ?? 0);

  const result = await pool.query(query, params);
  const countResult = await pool.query(`SELECT COUNT(*) FROM invoices ${divisionId ? 'WHERE division = $1' : ''}`, divisionId ? [divisionId] : []);

  return {
    invoices: result.rows,
    total: parseInt(countResult.rows[0].count),
    page,
    limit
  };
};

export const addPaymentService = async (invoiceId: number, amount: number, divisionId: string, method: string, userId: number, notes?: string) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get current invoice balance and client details
    const invRes = await client.query(
      `SELECT i.total_amount, i.amount_paid, i.balance_amount, i.client_id, c.credit_limit, i.invoice_number, c.id as valid_client_id
       FROM invoices i 
       LEFT JOIN clients c ON i.client_id = c.id
       WHERE i.id = $1 AND i.division = $2 FOR UPDATE`,
      [invoiceId, divisionId]
    );

    if (invRes.rows.length === 0) throw new Error('Invoice not found or access denied');
    
    const invoice = invRes.rows[0];
    const newPaidAmount = Number(invoice.amount_paid) + Number(amount);
    const newBalanceAmount = Number(invoice.total_amount) - newPaidAmount;

    if (newBalanceAmount < -0.01) throw new Error('Payment exceeds balance');

    let newStatus: InvoiceStatus = InvoiceStatus.PARTIAL;
    if (newBalanceAmount <= 0.01) newStatus = InvoiceStatus.PAID;

    // 2. Insert Payment Record
    await client.query(
      'INSERT INTO payments (invoice_id, amount, payment_method, notes, division, payment_date) VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)',
      [invoiceId, amount, method, notes, divisionId]
    );

    // 3. Credit Limit Logic (The Approval Bridge)
    // Check total outstanding for this client across ALL divisions (or based on business rule)
    let approvalStatus = 'approved';
    if (invoice.valid_client_id) {
      const clientBalanceRes = await client.query(
        'SELECT SUM(balance_amount) as total_outstanding FROM invoices WHERE client_id = $1',
        [invoice.client_id]
      );
      const currentClientOutstanding = Number(clientBalanceRes.rows[0].total_outstanding) - Number(amount); // Subtract current payment from total
      
      if (invoice.credit_limit && currentClientOutstanding > Number(invoice.credit_limit)) {
        approvalStatus = 'pending';
      }
    }

    // 4. Update Invoice
    await client.query(
      'UPDATE invoices SET amount_paid = $1, balance_amount = $2, status = $3, approval_status = $4, updated_at = NOW() WHERE id = $5',
      [newPaidAmount, newBalanceAmount, newStatus, approvalStatus, invoiceId]
    );

    // 5. Activity Log
    await client.query(
      `INSERT INTO activity_logs (user_id, action, module, entity_id, entity_type, details) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId, 
        'PAYMENT_RECORDED', 
        'CREDIT_CONTROL', 
        invoiceId.toString(), 
        'INVOICE', 
        JSON.stringify({ 
          amount, 
          method, 
          invoice_number: invoice.invoice_number,
          new_balance: newBalanceAmount,
          credit_flag: approvalStatus === 'pending'
        })
      ]
    );

    // 6. Ledger entry (Rule 1)
    if (!invoice.valid_client_id) {
       console.warn(`[WARNING] Payment recorded for orphaned invoice. Client ID ${invoice.client_id} not found.`);
    }

    await postBalancedLedgerEntry(client, {
      referenceType: 'CREDIT_PAYMENT',
      referenceId: invoiceId,
      clientId: invoice.valid_client_id || null,
      amount: Number(amount)
    });

    await client.query('COMMIT');
    return { 
      success: true, 
      newBalance: newBalanceAmount, 
      status: newStatus,
      flagged: approvalStatus === 'pending'
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};