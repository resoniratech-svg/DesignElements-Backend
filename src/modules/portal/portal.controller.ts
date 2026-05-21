import { Request, Response } from "express";
import { pool } from "../../config/db";
import { success, error } from "../../utils/response";
import bcrypt from "bcrypt";

// ================================
// CREATE USER (WITH client_id)
// ================================
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role_id, client_id } = req.body;

    if (!name || !email || !password || !role_id) {
      return error(res, "All fields are required", 400);
    }

    // Check existing user
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return error(res, "User already exists with this email", 400);
    }

    // Validate role
    const roleCheck = await pool.query(
      "SELECT id FROM roles WHERE id = $1",
      [role_id]
    );

    if (roleCheck.rows.length === 0) {
      return error(res, "Invalid role_id", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Insert user with client_id
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role_id, client_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role_id, client_id`,
      [name, email, hashedPassword, role_id, client_id || null]
    );

    return success(res, "User created successfully", result.rows[0]);

  } catch (err: any) {
    console.error("❌ ERROR CREATING USER:", err);
    return error(res, err.message || "Failed to create user", 500);
  }
};


// ================================
// GET CLIENT PROJECTS
// ================================
export const getClientProjects = async (req: any, res: Response) => {
  try {
    const client_id = req.user.id;

    if (!client_id) {
      return error(res, "Client not linked to user", 403);
    }

    const result = await pool.query(
      `SELECT * FROM projects WHERE client_id = $1 ORDER BY created_at DESC`,
      [client_id]
    );

    return success(res, "Client projects fetched", result.rows);

  } catch (err: any) {
    console.error(err);
    return error(res, err.message || "Server error", 500);
  }
};


// ================================
// GET CLIENT INVOICES
// ================================
export const getClientInvoices = async (req: any, res: Response) => {
  try {
    const client_id = req.user.id;

    if (!client_id) {
      return error(res, "Client not linked to user", 403);
    }

    const result = await pool.query(
      `SELECT 
        i.id, 
        i.invoice_number as number,
        i.invoice_number as "invoiceNo", 
        i.invoice_date as date, 
        i.due_date as "dueDate", 
        i.total_amount as amount, 
        i.amount_paid,
        i.balance_amount,
        i.status,
        i.division,
        u.name as client
       FROM invoices i
       LEFT JOIN users u ON i.client_id = u.id
       WHERE i.client_id = $1
       ORDER BY i.invoice_date DESC`,
      [client_id]
    );

    return success(res, "Client invoices fetched", result.rows);

  } catch (err: any) {
    console.error(err);
    return error(res, err.message || "Server error", 500);
  }
};

// ================================
// GET CLIENT BILLING SUMMARY
// ================================
export const getClientBillingSummary = async (req: any, res: Response) => {
  try {
    const client_id = req.user.id;

    if (!client_id) {
      return error(res, "Client not linked to user", 403);
    }

    const result = await pool.query(
      `SELECT 
        COALESCE(SUM(total_amount), 0) as total,
        COALESCE(SUM(amount_paid), 0) as paid,
        COALESCE(SUM(balance_amount), 0) as pending
       FROM invoices
       WHERE client_id = $1`,
      [client_id]
    );

    return success(res, "Billing summary fetched", result.rows[0]);

  } catch (err: any) {
    console.error(err);
    return error(res, err.message || "Server error", 500);
  }
};


// ================================
// GET CLIENT OUTSTANDING
// ================================
export const getClientOutstanding = async (req: any, res: Response) => {
  try {
    const client_id = req.user.id;

    if (!client_id) {
      return error(res, "Client not linked to user", 403);
    }

    const result = await pool.query(
      `SELECT id, invoice_number, total_amount, status, due_date
       FROM invoices
       WHERE client_id = $1 AND status != 'PAID'
       ORDER BY due_date ASC`,
      [client_id]
    );

    return success(res, "Outstanding invoices fetched", result.rows);

  } catch (err: any) {
    console.error(err);
    return error(res, err.message || "Server error", 500);
  }
};


// ================================
// GET CLIENT LEDGER
// ================================
export const getClientLedger = async (req: any, res: Response) => {
  try {
    const client_id = req.user.client_id;

    if (!client_id) {
      return error(res, "Client not linked to user", 403);
    }

    const result = await pool.query(
      `SELECT id, reference_type, reference_id, debit, credit, created_at
       FROM ledger_entries
       WHERE client_id = $1
       ORDER BY created_at DESC`,
      [client_id]
    );

    return success(res, "Client ledger fetched", result.rows);

  } catch (err: any) {
    console.error(err);
    return error(res, err.message || "Server error", 500);
  }
};