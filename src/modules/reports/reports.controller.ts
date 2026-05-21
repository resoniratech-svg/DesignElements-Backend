import { Request, Response } from "express";
import { pool } from "../../config/db";
import { success, error } from "../../utils/response";


// ============================
// Outstanding Invoices
// ============================

export const getOutstandingInvoices = async (req: Request, res: Response) => {
  try {

    const result = await pool.query(
      `SELECT
        id,
        invoice_number,
        client_id,
        total_amount,
        status,
        due_date
       FROM invoices
       WHERE status != 'PAID'
       ORDER BY due_date ASC`
    );

    return success(res, "Outstanding invoices fetched", result.rows);

  } catch (err) {

    console.error(err);
    return error(res, "Server error", 500);

  }
};


// ============================
// Revenue Report
// ============================

export const revenueReport = async (req: Request, res: Response) => {
  try {

    const result = await pool.query(`
      SELECT
        COALESCE(SUM(i.total_amount),0) AS total_revenue,
        COALESCE(SUM(p.amount),0) AS total_collected
      FROM invoices i
      LEFT JOIN payments p
      ON i.id = p.invoice_id
    `);

    // Convert NUMERIC strings → numbers
    const data = {
      total_revenue: Number(result.rows[0].total_revenue),
      total_collected: Number(result.rows[0].total_collected)
    };

    return success(res, "Revenue report generated", data);

  } catch (err: any) {

    console.error(err);
    return error(res, "Server error", 500);

  }
};


// ============================
// Client Financial Summary
// ============================

export const getClientSummary = async (req: Request, res: Response) => {
  try {

    const { client_id } = req.params;

    const result = await pool.query(
      `SELECT
        COALESCE(SUM(debit),0) AS total_invoiced,
        COALESCE(SUM(credit),0) AS total_paid,
        COALESCE(SUM(debit),0) - COALESCE(SUM(credit),0) AS outstanding_balance
       FROM ledger_entries
       WHERE client_id = $1`,
      [client_id]
    );

    // Convert NUMERIC strings → numbers
    const data = {
      total_invoiced: Number(result.rows[0].total_invoiced),
      total_paid: Number(result.rows[0].total_paid),
      outstanding_balance: Number(result.rows[0].outstanding_balance)
    };

    return success(res, "Client summary fetched", data);

  } catch (err) {

    console.error(err);
    return error(res, "Server error", 500);

  }
};