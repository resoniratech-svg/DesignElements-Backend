import { Request, Response } from "express";
import pool from "../../config/db";
import { createActivity } from "../activity/activity.service";

const success = (res: Response, message: string, data?: any) =>
  res.status(200).json({ success: true, message, data });
const error = (res: Response, message: string, code = 500) =>
  res.status(code).json({ success: false, message });

/**
 * GET ALL DELETED ITEMS
 */
export const getDeletedItems = async (req: any, res: Response) => {
  try {
    const division = req.query.division as string;

    // 1. Deleted Quotations
    let quoWhere = "WHERE q.deleted_at IS NOT NULL";
    const quoParams: any[] = [];
    if (division && division !== "all") {
      quoParams.push(division.toUpperCase());
      quoWhere += ` AND UPPER(q.division::TEXT) = $${quoParams.length}`;
    }

    const quotationsQuery = `
      SELECT 
        q.*,
        COALESCE(NULLIF(q.client_name, ''), c.contact_person, u.name) as client_name,
        COALESCE(NULLIF(q.client_company, ''), c.name, u.company_name, q.client_name) as client_company
      FROM quotations q
      LEFT JOIN users u ON q.client_id = u.id
      LEFT JOIN LATERAL (
        SELECT name, contact_person 
        FROM clients 
        WHERE user_id = q.client_id OR id = q.client_id 
        ORDER BY CASE WHEN user_id = q.client_id THEN 0 ELSE 1 END 
        LIMIT 1
      ) c ON true
      ${quoWhere}
      ORDER BY q.deleted_at DESC
    `;
    const quotationsRes = await pool.query(quotationsQuery, quoParams);

    // 2. Deleted Invoices
    let invWhere = "WHERE i.deleted_at IS NOT NULL";
    const invParams: any[] = [];
    if (division && division !== "all") {
      invParams.push(division.toUpperCase());
      invWhere += ` AND UPPER(COALESCE(i.division, i.branch, '')::TEXT) = $${invParams.length}`;
    }

    const invoicesQuery = `
      SELECT 
        i.*,
        COALESCE(i.client_company, c.name, u.company_name, i.client_name) as client_company,
        COALESCE(i.client_name, c.contact_person, u.name) as client_name
      FROM invoices i
      LEFT JOIN users u ON i.client_id = u.id
      LEFT JOIN LATERAL (
        SELECT name, contact_person 
        FROM clients 
        WHERE user_id = i.client_id OR id = i.client_id 
        ORDER BY CASE WHEN user_id = i.client_id THEN 0 ELSE 1 END 
        LIMIT 1
      ) c ON true
      ${invWhere}
      ORDER BY i.deleted_at DESC
    `;
    const invoicesRes = await pool.query(invoicesQuery, invParams);

    // 3. Deleted Delivery Notes (invoice itself is active, but dn_deleted_at is set)
    let dnWhere = "WHERE i.deleted_at IS NULL AND i.dn_deleted_at IS NOT NULL AND i.delivery_note IS NOT NULL AND TRIM(i.delivery_note) != ''";
    const dnParams: any[] = [];
    if (division && division !== "all") {
      dnParams.push(division.toUpperCase());
      dnWhere += ` AND UPPER(COALESCE(i.division, i.branch, '')::TEXT) = $${dnParams.length}`;
    }

    const dnQuery = `
      SELECT 
        i.*,
        COALESCE(i.client_company, c.name, u.company_name, i.client_name) as client_company,
        COALESCE(i.client_name, c.contact_person, u.name) as client_name
      FROM invoices i
      LEFT JOIN users u ON i.client_id = u.id
      LEFT JOIN LATERAL (
        SELECT name, contact_person 
        FROM clients 
        WHERE user_id = i.client_id OR id = i.client_id 
        ORDER BY CASE WHEN user_id = i.client_id THEN 0 ELSE 1 END 
        LIMIT 1
      ) c ON true
      ${dnWhere}
      ORDER BY i.dn_deleted_at DESC
    `;
    const dnRes = await pool.query(dnQuery, dnParams);

    // 4. Deleted Completion Certificates (invoice itself is active, but coc_deleted_at is set)
    let cocWhere = "WHERE i.deleted_at IS NULL AND i.coc_deleted_at IS NOT NULL AND i.coc_number IS NOT NULL AND TRIM(i.coc_number) != ''";
    const cocParams: any[] = [];
    if (division && division !== "all") {
      cocParams.push(division.toUpperCase());
      cocWhere += ` AND UPPER(COALESCE(i.division, i.branch, '')::TEXT) = $${cocParams.length}`;
    }

    const cocQuery = `
      SELECT 
        i.*,
        COALESCE(i.client_company, c.name, u.company_name, i.client_name) as client_company,
        COALESCE(i.client_name, c.contact_person, u.name) as client_name
      FROM invoices i
      LEFT JOIN users u ON i.client_id = u.id
      LEFT JOIN LATERAL (
        SELECT name, contact_person 
        FROM clients 
        WHERE user_id = i.client_id OR id = i.client_id 
        ORDER BY CASE WHEN user_id = i.client_id THEN 0 ELSE 1 END 
        LIMIT 1
      ) c ON true
      ${cocWhere}
      ORDER BY i.coc_deleted_at DESC
    `;
    const cocRes = await pool.query(cocQuery, cocParams);

    const quotations = quotationsRes.rows;
    const invoices = invoicesRes.rows;
    const deliveryNotes = dnRes.rows;
    const completionCertificates = cocRes.rows;

    return success(res, "Deleted items fetched successfully", {
      quotations,
      invoices,
      deliveryNotes,
      completionCertificates,
      counts: {
        quotations: quotations.length,
        invoices: invoices.length,
        deliveryNotes: deliveryNotes.length,
        completionCertificates: completionCertificates.length,
        total: quotations.length + invoices.length + deliveryNotes.length + completionCertificates.length
      }
    });
  } catch (err: any) {
    console.error("GET DELETED ITEMS ERROR:", err.message);
    return error(res, "Failed to fetch deleted items: " + err.message);
  }
};

/**
 * RESTORE AN ITEM
 */
export const restoreItem = async (req: any, res: Response) => {
  try {
    const { type, id } = req.params;
    const normalizedType = String(type).toLowerCase().replace(/s$/, "");

    if (normalizedType === "quotation") {
      const result = await pool.query(
        "UPDATE quotations SET deleted_at = NULL WHERE id::text = $1 OR qtn_number = $1 RETURNING id, qtn_number",
        [id]
      );
      if (result.rowCount === 0) return error(res, "Quotation not found in trash", 404);

      try {
        await createActivity({
          userId: req.user?.id || 1,
          action: "RESTORE_QUOTATION",
          module: "QUOTATION",
          details: { quotation_id: result.rows[0].id, qtn_number: result.rows[0].qtn_number }
        });
      } catch (actErr) {}

      return success(res, `Quotation ${result.rows[0].qtn_number || id} restored successfully`);
    }

    if (normalizedType === "invoice") {
      const result = await pool.query(
        "UPDATE invoices SET deleted_at = NULL WHERE id = $1 RETURNING id, invoice_number",
        [id]
      );
      if (result.rowCount === 0) return error(res, "Invoice not found in trash", 404);

      try {
        await createActivity({
          userId: req.user?.id || 1,
          action: "RESTORE_INVOICE",
          module: "INVOICE",
          details: { invoice_id: result.rows[0].id, invoice_number: result.rows[0].invoice_number }
        });
      } catch (actErr) {}

      return success(res, `Invoice ${result.rows[0].invoice_number || id} restored successfully`);
    }

    if (normalizedType === "delivery_note" || normalizedType === "delivery-note" || normalizedType === "deliverynote") {
      const result = await pool.query(
        "UPDATE invoices SET dn_deleted_at = NULL WHERE id = $1 RETURNING id, delivery_note, invoice_number",
        [id]
      );
      if (result.rowCount === 0) return error(res, "Delivery Note not found in trash", 404);

      try {
        await createActivity({
          userId: req.user?.id || 1,
          action: "RESTORE_DELIVERY_NOTE",
          module: "INVOICE",
          details: { invoice_id: result.rows[0].id, delivery_note: result.rows[0].delivery_note }
        });
      } catch (actErr) {}

      return success(res, `Delivery Note ${result.rows[0].delivery_note || id} restored successfully`);
    }

    if (normalizedType === "completion_certificate" || normalizedType === "completion-certificate" || normalizedType === "certificate") {
      const result = await pool.query(
        "UPDATE invoices SET coc_deleted_at = NULL WHERE id = $1 RETURNING id, coc_number, invoice_number",
        [id]
      );
      if (result.rowCount === 0) return error(res, "Completion Certificate not found in trash", 404);

      try {
        await createActivity({
          userId: req.user?.id || 1,
          action: "RESTORE_CERTIFICATE",
          module: "INVOICE",
          details: { invoice_id: result.rows[0].id, coc_number: result.rows[0].coc_number }
        });
      } catch (actErr) {}

      return success(res, `Completion Certificate ${result.rows[0].coc_number || id} restored successfully`);
    }

    return error(res, `Invalid item type: ${type}`, 400);
  } catch (err: any) {
    console.error("RESTORE ITEM ERROR:", err.message);
    return error(res, "Failed to restore item: " + err.message);
  }
};

/**
 * PERMANENT DELETE ITEM (PURGE FROM DB)
 */
export const permanentDeleteItem = async (req: any, res: Response) => {
  const client = await pool.connect();
  try {
    const { type, id } = req.params;
    const normalizedType = String(type).toLowerCase().replace(/s$/, "");

    if (normalizedType === "quotation") {
      await client.query("BEGIN");
      const result = await client.query(
        "DELETE FROM quotations WHERE id::text = $1 OR qtn_number = $1 RETURNING id, qtn_number",
        [id]
      );
      if (result.rowCount === 0) {
        await client.query("ROLLBACK");
        return error(res, "Quotation not found", 404);
      }
      await client.query("COMMIT");

      try {
        await createActivity({
          userId: req.user?.id || 1,
          action: "PERMANENT_DELETE_QUOTATION",
          module: "QUOTATION",
          details: { quotation_id: result.rows[0].id, qtn_number: result.rows[0].qtn_number }
        });
      } catch (actErr) {}

      return success(res, `Quotation ${result.rows[0].qtn_number || id} permanently deleted from database`);
    }

    if (normalizedType === "invoice") {
      await client.query("BEGIN");
      const numId = Number(id);
      await client.query("DELETE FROM invoice_items WHERE invoice_id = $1", [numId]);
      await client.query("DELETE FROM payments WHERE invoice_id = $1", [numId]);
      const result = await client.query("DELETE FROM invoices WHERE id = $1 RETURNING id, invoice_number", [numId]);

      if (result.rowCount === 0) {
        await client.query("ROLLBACK");
        return error(res, "Invoice not found", 404);
      }
      await client.query("COMMIT");

      try {
        await createActivity({
          userId: req.user?.id || 1,
          action: "PERMANENT_DELETE_INVOICE",
          module: "INVOICE",
          details: { invoice_id: result.rows[0].id, invoice_number: result.rows[0].invoice_number }
        });
      } catch (actErr) {}

      return success(res, `Invoice ${result.rows[0].invoice_number || id} permanently deleted from database`);
    }

    if (normalizedType === "delivery_note" || normalizedType === "delivery-note" || normalizedType === "deliverynote") {
      // ONLY clear delivery note data from the invoice. The invoice itself remains completely untouched!
      const result = await pool.query(
        `UPDATE invoices SET 
          delivery_note = NULL,
          dn_date = NULL,
          dn_prepared_by = NULL,
          dn_checked_by = NULL,
          dn_receiver_name = NULL,
          dn_deleted_at = NULL
        WHERE id = $1 RETURNING id, invoice_number`,
        [Number(id)]
      );

      if (result.rowCount === 0) return error(res, "Invoice / Delivery Note not found", 404);

      try {
        await createActivity({
          userId: req.user?.id || 1,
          action: "PERMANENT_DELETE_DELIVERY_NOTE",
          module: "INVOICE",
          details: { invoice_id: result.rows[0].id, invoice_number: result.rows[0].invoice_number }
        });
      } catch (actErr) {}

      return success(res, `Delivery Note permanently deleted. Parent Invoice ${result.rows[0].invoice_number} remains intact.`);
    }

    if (normalizedType === "completion_certificate" || normalizedType === "completion-certificate" || normalizedType === "certificate") {
      // ONLY clear certificate data from the invoice. The invoice itself remains completely untouched!
      const result = await pool.query(
        `UPDATE invoices SET 
          coc_number = NULL,
          coc_date = NULL,
          coc_start_date = NULL,
          coc_completion_date = NULL,
          coc_product = NULL,
          coc_remarks = NULL,
          coc_has_no_remarks = TRUE,
          coc_deleted_at = NULL
        WHERE id = $1 RETURNING id, invoice_number`,
        [Number(id)]
      );

      if (result.rowCount === 0) return error(res, "Invoice / Completion Certificate not found", 404);

      try {
        await createActivity({
          userId: req.user?.id || 1,
          action: "PERMANENT_DELETE_CERTIFICATE",
          module: "INVOICE",
          details: { invoice_id: result.rows[0].id, invoice_number: result.rows[0].invoice_number }
        });
      } catch (actErr) {}

      return success(res, `Completion Certificate permanently deleted. Parent Invoice ${result.rows[0].invoice_number} remains intact.`);
    }

    return error(res, `Invalid item type: ${type}`, 400);
  } catch (err: any) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("PERMANENT DELETE ERROR:", err.message);
    return error(res, "Failed to permanently delete item: " + err.message);
  } finally {
    client.release();
  }
};
