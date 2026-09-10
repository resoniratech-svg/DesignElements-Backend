import { Request, Response } from "express";
import pool from "../../config/db";
import { validateCreditLimit } from "../../utils/creditService";
import { createAuditLog } from "../../utils/auditService";

// Helper for standardized responses
const success = (res: Response, message: string, data?: any) => res.status(200).json({ success: true, message, data });
const error = (res: Response, message: string, code = 500) => res.status(code).json({ success: false, message });

/**
 * GET ALL QUOTATIONS
 * Role-aware: Clients only see their own
 */
export const getQuotations = async (req: any, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const division = req.query.division as string;
    const offset = (page - 1) * limit;

    const params: any[] = [];
    let whereClause = "";

    if (req.user && req.user.role === 'CLIENT') {
      params.push(req.user.id);
      whereClause = ` WHERE q.client_id = $${params.length}`;
    }

    if (division && division !== 'all') {
      params.push(division.toUpperCase());
      whereClause = whereClause
        ? `${whereClause} AND UPPER(q.division::TEXT) = $${params.length}`
        : ` WHERE UPPER(q.division::TEXT) = $${params.length}`;
    }

    const countQuery = `
      SELECT COUNT(*) as count 
      FROM quotations q
      LEFT JOIN clients c ON q.client_id = c.id
      LEFT JOIN users u ON q.client_id = u.id
      ${whereClause}
    `;
    const totalRes = await pool.query(countQuery, params);
    const total = parseInt(totalRes.rows[0].count);

    let query = `
      SELECT 
        q.*,
        COALESCE(c.contact_person, u.name, q.client_name) as client_name,
        COALESCE(c.name, u.company_name, q.client_name) as client_company
      FROM quotations q
      LEFT JOIN clients c ON q.client_id = c.id
      LEFT JOIN users u ON q.client_id = u.id
      ${whereClause}
      ORDER BY q.updated_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return success(res, "Quotations fetched successfully", {
      data: result.rows,
      total,
      page,
      limit
    });
  } catch (err: any) {
    console.error("GET QUOTATIONS ERROR:", err.message);
    return error(res, "Failed to fetch quotations");
  }
};

/**
 * CREATE QUOTATION
 */
export const createQuotation = async (req: any, res: Response) => {
  const client = await pool.connect();
  try {
    const {
      qtn_number,
      client_id,
      division,
      total_amount,
      discount,
      status,
      items,
      valid_until,
      terms,
      project_name,
      client_name,
      attn,
      attn_designation,
      salutation,
      reference_no,
      intro_text,
      tc_terms,
      tc_payment,
      tc_delivery,
      tc_installation,
      tc_validity,
      outro_text,
      salesman,
      salesman_designation,
      salesman_phone,
      salesman_email,
      client_phone,
      client_email,
      selected_format,
      created_at
    } = req.body;

    let final_qtn = qtn_number;
    if (!final_qtn) {
      // Auto-generate if missing
      const divPrefix = ({
        'trading': 'TRD',
        'contracting': 'CON',
      } as any)[division?.toLowerCase() || 'contracting'] || 'CON';

      const formatPrefix = `${divPrefix}-QUO-`;
      const resData = await client.query(`
        SELECT qtn_number FROM quotations 
        WHERE qtn_number LIKE $1 ORDER BY qtn_number DESC LIMIT 1
      `, [`${formatPrefix}%`]);

      let nextNum = 1;
      if (resData.rows.length > 0) {
        const lastQtn = resData.rows[0].qtn_number;
        const parts = lastQtn.split('-');
        const lastPart = parts[parts.length - 1];
        const parsed = parseInt(lastPart);
        if (!isNaN(parsed)) nextNum = parsed + 1;
      }
      final_qtn = `${formatPrefix}${nextNum.toString().padStart(3, '0')}`;
    }

    if (!client_id) {
      return error(res, "Client ID is required", 400);
    }

    await client.query("BEGIN");

    // ✅ mapping: Ensure client_id points to a record in the 'users' table
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
        console.log(`[QUOTATION_FIX] Mapped Client ID ${client_id} to User ID ${target_user_id}`);
      }
    }

    // ✅ 1. Credit Control Check for Quotation
    let final_status = (status || 'PENDING_APPROVAL').toUpperCase();
    const creditCheck = await validateCreditLimit(client, target_user_id, total_amount || 0);

    if (creditCheck.isExceeded && final_status === 'APPROVED') {
      final_status = 'PENDING_APPROVAL';
      console.log(`CREDIT LIMIT TRIGGERED for Quotation: Status forced to PENDING_APPROVAL`);
    }

    const query = `
      INSERT INTO quotations (
        qtn_number, 
        client_id, 
        division, 
        total_amount, 
        status, 
        items, 
        valid_until, 
        terms,
        project_name,
        client_name,
        attn,
        attn_designation,
        salutation,
        reference_no,
        intro_text,
        tc_terms,
        tc_payment,
        tc_delivery,
        tc_installation,
        tc_validity,
        outro_text,
        salesman,
        salesman_designation,
        salesman_phone,
        salesman_email,
        client_phone,
        client_email,
        selected_format,
        discount,
        created_at
      ) VALUES ($1, $2, $3::division_type, $4, $5::approval_status, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, COALESCE($30::timestamp, NOW()))
      RETURNING *
    `;

    const values = [
      final_qtn,
      target_user_id || null,
      (division || 'CONTRACTING').toUpperCase().trim(),
      total_amount || 0,
      final_status,
      JSON.stringify(items || []),
      valid_until ? new Date(valid_until).toISOString() : null,
      terms || '',
      project_name || '',
      client_name || '',
      attn || null,
      attn_designation || null,
      salutation || null,
      reference_no || null,
      intro_text || null,
      tc_terms || null,
      tc_payment || null,
      tc_delivery || null,
      tc_installation || null,
      tc_validity || null,
      outro_text || null,
      salesman || null,
      salesman_designation || null,
      salesman_phone || null,
      salesman_email || null,
      client_phone || null,
      client_email || null,
      selected_format || 'quotation1',
      discount || 0,
      created_at ? new Date(created_at).toISOString() : null
    ];

    const result = await client.query(query, values);
    const quotationId = result.rows[0].id;

    // ✅ 2. Log Credit Override if applicable
    if (creditCheck.isExceeded) {
      await createAuditLog(client, {
        userId: req.user.id,
        action: "CREDIT_OVERRIDE",
        entityType: "QUOTATION",
        entityId: quotationId,
        oldValue: { status: status || 'NEW' },
        newValue: { status: 'PENDING_APPROVAL', ...creditCheck }
      });
    }

    await client.query("COMMIT");
    return success(res, "Quotation created successfully", result.rows[0]);

  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("CREATE QUOTATIONS ERROR:", err.message);
    return error(res, "Failed to create quotation: " + err.message);
  } finally {
    client.release();
  }
};

/**
 * Helper to compute the next revision ID for a quotation
 * Examples:
 * CON-QUO-001 -> CON-QUO-001(1.1)
 * CON-QUO-001(1.1) -> CON-QUO-001(1.2)
 * CON-QUO-002 -> CON-QUO-002(2.1)
 */
async function generateNextQuotationRevision(client: any, currentQtnNumber: string): Promise<string> {
  // 1. Extract base quotation string (strip existing revision suffix e.g. "(1.1)")
  const baseMatch = currentQtnNumber.match(/^([^(]+)(?:\((\d+)\.(\d+)\))?$/);
  const baseQtn = baseMatch ? baseMatch[1].trim() : currentQtnNumber.trim();

  // 2. Extract the base sequence integer (e.g. from "CON-QUO-001" -> 1, "CON-QUO-002" -> 2)
  const numMatch = baseQtn.match(/(\d+)$/);
  const baseSequenceNum = numMatch ? parseInt(numMatch[1], 10) : 1;

  // 3. Query all existing records matching baseQtn or baseQtn(baseSequenceNum.%)
  const searchPattern = `${baseQtn}(${baseSequenceNum}.%`;
  const existingRes = await client.query(
    `SELECT qtn_number FROM quotations WHERE qtn_number = $1 OR qtn_number LIKE $2`,
    [baseQtn, searchPattern]
  );

  let maxRevision = baseMatch && baseMatch[3] ? parseInt(baseMatch[3], 10) : 0;
  const escapedBase = baseQtn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^${escapedBase}\\(${baseSequenceNum}\\.(\\d+)\\)$`);

  for (const row of existingRes.rows) {
    const qtn = row.qtn_number;
    const m = qtn.match(regex);
    if (m && m[1]) {
      const revNum = parseInt(m[1], 10);
      if (revNum > maxRevision) {
        maxRevision = revNum;
      }
    }
  }

  const nextRevision = maxRevision + 1;
  return `${baseQtn}(${baseSequenceNum}.${nextRevision})`;
}

/**
 * UPDATE QUOTATION (Creates a new immutable revision record)
 */
export const updateQuotation = async (req: any, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      qtn_number,
      status,
      total_amount,
      discount,
      items,
      valid_until,
      terms,
      project_name,
      client_name,
      client_id,
      division,
      attn,
      attn_designation,
      salutation,
      reference_no,
      intro_text,
      tc_terms,
      tc_payment,
      tc_delivery,
      tc_installation,
      tc_validity,
      outro_text,
      salesman,
      salesman_designation,
      salesman_phone,
      salesman_email,
      client_phone,
      client_email,
      selected_format,
      created_at
    } = req.body;

    await client.query("BEGIN");

    // 1. Get old record and ensure it exists
    const oldRes = await client.query(`SELECT * FROM quotations WHERE id::text = $1 OR qtn_number = $1`, [id]);
    if (!oldRes.rows.length) return error(res, "Quotation not found", 404);
    const oldRecord = oldRes.rows[0];

    // Check if this is purely a status update or a content edit
    const isStatusOnlyUpdate = 
      status !== undefined &&
      items === undefined &&
      total_amount === undefined &&
      terms === undefined &&
      intro_text === undefined &&
      project_name === undefined;

    if (isStatusOnlyUpdate) {
      // Pure status change: update the existing row directly
      const updatedStatus = status.toUpperCase();
      const statusRes = await client.query(
        `UPDATE quotations SET status = $1::approval_status, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [updatedStatus, oldRecord.id]
      );
      await client.query("COMMIT");
      return success(res, "Quotation status updated successfully", statusRes.rows[0]);
    }

    // 2. Full Edit: Generate NEW revision number or use custom qtn_number (preserving oldRecord untouched)
    const newQtnNumber = (qtn_number && qtn_number.trim() && qtn_number.trim() !== oldRecord.qtn_number)
      ? qtn_number.trim()
      : await generateNextQuotationRevision(client, oldRecord.qtn_number);

    let target_user_id = client_id || oldRecord.client_id;
    if (target_user_id) {
      const clientMap = await client.query(`SELECT user_id FROM clients WHERE id = $1`, [target_user_id]);
      if (clientMap.rows.length > 0 && clientMap.rows[0].user_id) {
        target_user_id = clientMap.rows[0].user_id;
      }
    }

    const final_status = (status || oldRecord.status || 'PENDING_APPROVAL').toUpperCase();
    const final_division = (division || oldRecord.division || 'CONTRACTING').toUpperCase().trim();

    const insertQuery = `
      INSERT INTO quotations (
        qtn_number,
        client_id,
        division,
        total_amount,
        status,
        items,
        valid_until,
        terms,
        project_name,
        client_name,
        attn,
        attn_designation,
        salutation,
        reference_no,
        intro_text,
        tc_terms,
        tc_payment,
        tc_delivery,
        tc_installation,
        tc_validity,
        outro_text,
        salesman,
        salesman_designation,
        salesman_phone,
        salesman_email,
        client_phone,
        client_email,
        selected_format,
        discount,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3::division_type, $4, $5::approval_status, $6::jsonb, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29,
        COALESCE($30::timestamp, NOW()), NOW()
      )
      RETURNING *
    `;

    const values = [
      newQtnNumber,
      target_user_id || null,
      final_division,
      total_amount !== undefined ? total_amount : oldRecord.total_amount,
      final_status,
      JSON.stringify(items || oldRecord.items || []),
      valid_until ? new Date(valid_until).toISOString() : (oldRecord.valid_until ? new Date(oldRecord.valid_until).toISOString() : null),
      terms !== undefined ? terms : (oldRecord.terms || ''),
      project_name || oldRecord.project_name || '',
      client_name || oldRecord.client_name || '',
      attn !== undefined ? attn : oldRecord.attn,
      attn_designation !== undefined ? attn_designation : oldRecord.attn_designation,
      salutation !== undefined ? salutation : oldRecord.salutation,
      reference_no !== undefined ? reference_no : oldRecord.reference_no,
      intro_text !== undefined ? intro_text : oldRecord.intro_text,
      tc_terms !== undefined ? tc_terms : oldRecord.tc_terms,
      tc_payment !== undefined ? tc_payment : oldRecord.tc_payment,
      tc_delivery !== undefined ? tc_delivery : oldRecord.tc_delivery,
      tc_installation !== undefined ? tc_installation : oldRecord.tc_installation,
      tc_validity !== undefined ? tc_validity : oldRecord.tc_validity,
      outro_text !== undefined ? outro_text : oldRecord.outro_text,
      salesman !== undefined ? salesman : oldRecord.salesman,
      salesman_designation !== undefined ? salesman_designation : oldRecord.salesman_designation,
      salesman_phone !== undefined ? salesman_phone : oldRecord.salesman_phone,
      salesman_email !== undefined ? salesman_email : oldRecord.salesman_email,
      client_phone !== undefined ? client_phone : oldRecord.client_phone,
      client_email !== undefined ? client_email : oldRecord.client_email,
      selected_format || oldRecord.selected_format || 'quotation1',
      discount !== undefined ? Number(discount) : Number(oldRecord.discount || 0),
      created_at ? new Date(created_at).toISOString() : null
    ];

    const result = await client.query(insertQuery, values);
    const newQuotation = result.rows[0];

    // Log Audit
    try {
      if (req.user) {
        await createAuditLog(client, {
          userId: req.user.id,
          action: "REVISION_CREATED",
          entityType: "QUOTATION",
          entityId: newQuotation.id,
          oldValue: { qtn_number: oldRecord.qtn_number },
          newValue: { qtn_number: newQuotation.qtn_number }
        });
      }
    } catch (auditErr: any) {
      console.error(`[AUDIT_LOG_ERROR] Failed to log revision for ${newQtnNumber}:`, auditErr.message);
    }

    await client.query("COMMIT");
    return success(res, "Quotation revision created successfully", newQuotation);
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("UPDATE QUOTATION ERROR:", err.message);
    return error(res, "Failed to update quotation: " + err.message);
  } finally {
    client.release();
  }
};

/**
 * GET QUOTATION BY ID
 */
export const getQuotationById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    let query = `
      SELECT 
        q.*,
        COALESCE(c.contact_person, u.name, q.client_name) as client_name,
        COALESCE(c.name, u.company_name, q.client_name) as client_company
      FROM quotations q
      LEFT JOIN clients c ON q.client_id = c.id
      LEFT JOIN users u ON q.client_id = u.id
      WHERE (q.id::text = $1 OR q.qtn_number = $1)
    `;

    const params = [id];

    if (req.user && req.user.role === 'CLIENT') {
      params.push(req.user.id);
      query += ` AND q.client_id = $2`;
    }

    const result = await pool.query(query, params);
    if (result.rows.length === 0) return error(res, "Quotation not found", 404);
    return success(res, "Quotation fetched successfully", result.rows[0]);
  } catch (err: any) {
    console.error("GET QUOTATION BY ID ERROR:", err.message);
    return error(res, "Failed to fetch quotation");
  }
};

/**
 * GET NEXT QUOTATION NUMBER
 */
export const getNextQuotationNumber = async (req: Request, res: Response) => {
  try {
    const { division } = req.params;
    const divisionStr = String(division);
    const prefixMap: Record<string, string> = {
      'trading': 'TRD',
      'contracting': 'CON',
    };

    const prefix = prefixMap[divisionStr.toLowerCase()] || 'CON';
    const formatPrefix = `${prefix}-QUO-`;

    // Fetch all quotations for this division prefix
    const resData = await pool.query(`
      SELECT qtn_number 
      FROM quotations 
      WHERE qtn_number LIKE $1
    `, [`${formatPrefix}%`]);

    let maxBaseNum = 0;
    for (const row of resData.rows) {
      const qtn = row.qtn_number;
      // Extract base number before any parentheses
      const baseMatch = qtn.match(new RegExp(`^${formatPrefix}(\\d+)`));
      if (baseMatch && baseMatch[1]) {
        const num = parseInt(baseMatch[1], 10);
        if (num > maxBaseNum) {
          maxBaseNum = num;
        }
      }
    }

    const nextNum = maxBaseNum + 1;
    const formattedNum = nextNum.toString().padStart(3, '0');
    return success(res, "Next number fetched", { nextNumber: `${formatPrefix}${formattedNum}` });
  } catch (err: any) {
    console.error("GET NEXT NUMBER ERROR:", err.message);
    return error(res, "Failed to fetch next number");
  }
};

/**
 * DELETE QUOTATION
 */
export const deleteQuotation = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Check if it exists
    const checkRes = await pool.query(`SELECT id FROM quotations WHERE id::text = $1 OR qtn_number = $1`, [id]);
    if (checkRes.rows.length === 0) return error(res, "Quotation not found", 404);

    const targetId = checkRes.rows[0].id;

    // 2. Perform Delete
    await pool.query(`DELETE FROM quotations WHERE id = $1`, [targetId]);

    return success(res, "Quotation deleted successfully from database");
  } catch (err: any) {
    console.error("DELETE QUOTATION ERROR:", err.message);
    return error(res, "Failed to delete quotation");
  }
};
