import { pool } from "../../config/db";

export const insertInvoice = async (client: any, data: any) => {
  const result = await client.query(
    `INSERT INTO invoices
    (invoice_number, division, client_id, invoice_date, due_date,
     payment_terms, total_amount, subtotal, tax_rate, tax_amount,
     discount, amount_paid, balance_amount, status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    RETURNING *`,
    [
      data.invoice_number,
      data.division,
      data.client_id,
      data.invoice_date,
      data.due_date,
      data.payment_terms,
      data.total_amount,
      data.subtotal,
      data.tax_rate,
      data.tax_amount,
      data.discount,
      data.amount_paid,
      data.balance_amount,
      data.status,
    ]
  );

  return result.rows[0];
};