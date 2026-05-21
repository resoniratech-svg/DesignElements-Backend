import { Request } from "express";
import { pool } from "../../config/db";

export const getInvoicesService = async (req: Request) => {
  const {
    page = "1",
    limit = "20",
    division,
    status,
    search = "",
    fromDate,
    toDate,
    sortBy = "created_at",
    order = "desc",
  } = req.query;

  const pageNumber = Math.max(parseInt(page as string), 1);
  const limitNumber = Math.min(parseInt(limit as string), 100);
  const offset = (pageNumber - 1) * limitNumber;

  const values: any[] = [];
  let whereClause = "WHERE 1=1";

  // 🔍 Filters
  if (division) {
    values.push(division);
    whereClause += ` AND division = $${values.length}`;
  }

  if (status) {
    values.push(status);
    whereClause += ` AND status = $${values.length}`;
  }

  if (search) {
    values.push(`%${search}%`);
    whereClause += ` AND (invoice_number ILIKE $${values.length})`;
  }

  if (fromDate) {
    values.push(fromDate);
    whereClause += ` AND invoice_date >= $${values.length}`;
  }

  if (toDate) {
    values.push(toDate);
    whereClause += ` AND invoice_date <= $${values.length}`;
  }

  // 🧮 TOTAL COUNT
  const countQuery = `
    SELECT COUNT(*) 
    FROM invoices
    ${whereClause}
  `;

  const countResult = await pool.query(countQuery, values);
  const total = parseInt(countResult.rows[0].count);

  // 📊 DATA QUERY
  const dataQuery = `
    SELECT 
      i.id,
      i.invoice_number,
      i.client_id,
      c.name as client_name,
      i.division,
      i.invoice_date,
      i.due_date,
      i.total_amount,
      i.amount_paid,
      i.balance_amount,
      i.status,
      i.created_at
    FROM invoices i
    LEFT JOIN clients c ON c.id = i.client_id
    ${whereClause}
    ORDER BY ${sortBy} ${order}
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `;

  values.push(limitNumber, offset);

  const dataResult = await pool.query(dataQuery, values);

  return {
    data: dataResult.rows,
    meta: {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber),
    },
  };
};


export const getInvoiceByIdService = async (invoiceId: number) => {

  // 🔹 1. Get invoice + client
  const invoiceRes = await pool.query(
    `SELECT 
      i.*,
      c.id as client_id,
      c.name as client_name,
      c.phone as client_phone
     FROM invoices i
     LEFT JOIN clients c ON c.id = i.client_id
     WHERE i.id = $1`,
    [invoiceId]
  );

  if (invoiceRes.rows.length === 0) {
    throw new Error("Invoice not found");
  }

  const invoice = invoiceRes.rows[0];

  // 🔹 2. Get items
  const itemsRes = await pool.query(
    `SELECT description, quantity, unit_price, total
     FROM invoice_items
     WHERE invoice_id = $1`,
    [invoiceId]
  );

  // 🔹 3. Get payments
  const paymentsRes = await pool.query(
    `SELECT id, amount, payment_date, payment_method
     FROM payments
     WHERE invoice_id = $1
     ORDER BY payment_date DESC`,
    [invoiceId]
  );

  return {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    division: invoice.division,

    client: {
      id: invoice.client_id,
      name: invoice.client_name,
      phone: invoice.client_phone,
    },

    invoice_date: invoice.invoice_date,
    due_date: invoice.due_date,

    total_amount: Number(invoice.total_amount),
    amount_paid: Number(invoice.amount_paid),
    balance_amount: Number(invoice.balance_amount),
    status: invoice.status,

    items: itemsRes.rows,
    payments: paymentsRes.rows,
  };
};