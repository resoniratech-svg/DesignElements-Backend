import { Request, Response } from "express";
import { pool } from "../../config/db";
import bcrypt from "bcrypt";
import { success, error } from "../../utils/response";
import { generateClientCode } from "../../utils/clientCodeGenerator";

export const getUsers = async (req: Request, res: Response) => {
  try {
    const { sector, role } = req.query;
    const user = (req as any).user;

    let query = `
      SELECT u.id, u.name, u.email, u.phone, u.status, u.sector, u.division, u.created_at, u.updated_at, r.name as role,
             u.company_name, u.address, u.qid, u.cr_number, u.computer_card, u.start_date, u.renewal_date, u.contract_type, u.password_plain
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE 1=1
    `;
    const params: any[] = [];

    let filterSector = sector;
    if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'ACCOUNTS') {
      filterSector = user.sector || user.division;
    }

    if (filterSector) {
      params.push(filterSector.toString().toUpperCase());
      query += ` AND (UPPER(u.sector) = $${params.length} OR UPPER(u.division) = $${params.length})`;
    }

    if (role) {
      params.push(role);
      query += ` AND r.name = $${params.length}`;
    }

    query += ` ORDER BY u.created_at DESC`;

    const result = await pool.query(query, params);
    return success(res, "Users fetched", result.rows);
  } catch (err: any) {
    console.error("Get users error:", err);
    return error(res, err.message || "Server error", 500);
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const {
      name, email, password, phone, role, sector, division,
      company_name, address, qid, cr_number, computer_card,
      start_date, renewal_date, contract_type, licenses, documents,
      qid_doc_url, cr_doc_url, computer_card_doc_url, contract_doc_url
    } = req.body;

    // Standardization
    const normalizedDivision = division?.trim().toUpperCase();
    const normalizedSector = (sector || division)?.trim().toUpperCase();

    if (!name || !password) {
      return error(res, "Name and password are required", 400);
    }

    // Check if email already exists
    if (email) {
      const existingUser = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
      if (existingUser.rows.length > 0) {
        return error(res, "This email is already registered in the system. Please use a different email or update the existing user.", 400);
      }
    }

    const roleQuery = await pool.query(`SELECT id FROM roles WHERE name = $1`, [role || 'USER']);
    let role_id = roleQuery.rows[0]?.id;

    if (!role_id) {
      // fallback
      const fallbackRole = await pool.query(`SELECT id FROM roles LIMIT 1`);
      role_id = fallbackRole.rows[0]?.id;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (
        name, email, password_hash, phone, role_id, sector, division,
        company_name, address, qid, cr_number, computer_card, 
        start_date, renewal_date, contract_type, password_plain,
        qid_doc_url, cr_doc_url, computer_card_doc_url, contract_doc_url
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       RETURNING id, name, email, phone, sector, division, company_name`,
      [
        name, email, hashedPassword, phone, role_id, normalizedSector, normalizedDivision,
        company_name, address, qid, cr_number, computer_card,
        start_date && start_date.trim() !== "" ? start_date : null,
        renewal_date && renewal_date.trim() !== "" ? renewal_date : null,
        contract_type, password,
        qid_doc_url, cr_doc_url, computer_card_doc_url, contract_doc_url
      ]
    );
    const user = result.rows[0];

    // SYNC TO CLIENTS TABLE IF ROLE IS CLIENT
    if (role === 'CLIENT') {
      console.log(`[SYNC] Starting client sync for user ${user.id} (${email})`);
      try {
        const clientCode = await generateClientCode(normalizedDivision || sector);
        console.log(`[SYNC] Generated code: ${clientCode} for division: ${normalizedDivision}`);

        const clientResult = await pool.query(
          `INSERT INTO clients (name, email, phone, address, contact_person, division, sector, client_code, user_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
          [
            company_name || "",
            email,
            phone,
            address,
            name, // Contact Person
            normalizedDivision || division,
            normalizedDivision || division, // Sector
            clientCode,
            user.id
          ]
        );
        const clientId = clientResult.rows[0].id;
        console.log(`[SYNC] Client record created successfully for user ${user.id}, client id: ${clientId}`);

        // Save licenses to client_licenses
        if (licenses && Array.isArray(licenses) && licenses.length > 0) {
          for (const lic of licenses) {
            await pool.query(
              `INSERT INTO client_licenses (client_id, license_name, license_type, license_number, expiry_date, document_url)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                clientId,
                lic.type || lic.number, // fallback name
                lic.type,
                lic.number,
                lic.expiryDate || null,
                lic.documentUrl || null
              ]
            );
          }
          console.log(`[SYNC] ${licenses.length} licenses saved for client ${clientId}`);
        }

        // Save documents to client_agreements
        if (documents && Array.isArray(documents) && documents.length > 0) {
          for (const doc of documents) {
            await pool.query(
              `INSERT INTO client_agreements (client_id, title, file_url)
               VALUES ($1, $2, $3)`,
              [
                clientId,
                doc.originalName || doc.title || 'Uploaded Document',
                doc.url || doc.fileUrl
              ]
            );
          }
          console.log(`[SYNC] ${documents.length} documents saved for client ${clientId}`);
        }
      } catch (syncErr) {
        console.error("!!! CLIENT SYNC ERROR !!!", syncErr);
        // We don't fail the user creation if client sync fails, but we log it
      }
    }

    return success(res, "User created", user);
  } catch (err: any) {
    console.error("!!! CREATE USER FAILED !!!");
    console.error("Error Message:", err.message);
    console.error("Error Stack:", err.stack);
    if (err.detail) console.error("Database detail:", err.detail);

    return error(res, err.message || "Server error", 400);
  }
};

export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return error(res, "User not found", 404);
    }

    return success(res, "Status updated", result.rows[0]);
  } catch (err: any) {
    return error(res, err.message || "Server error", 400);
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const roleQuery = await pool.query(`SELECT id FROM roles WHERE name = $1`, [role]);
    const role_id = roleQuery.rows[0]?.id;

    if (!role_id) {
      return error(res, "Invalid role", 400);
    }

    const result = await pool.query(
      `UPDATE users SET role_id = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
      [role_id, id]
    );

    if (result.rows.length === 0) {
      return error(res, "User not found", 404);
    }

    return success(res, "Role updated", result.rows[0]);
  } catch (err: any) {
    return error(res, err.message || "Server error", 400);
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const {
      name,
      email,
      phone,
      sector,
      division,
      status,
      role
    } = req.body;

    const normalizedSector = sector?.trim().toUpperCase();
    const normalizedDivision = division?.trim().toUpperCase();

    const result = await pool.query(
      `UPDATE users
       SET
         name = COALESCE($1, name),
         email = COALESCE($2, email),
         phone = COALESCE($3, phone),
         sector = COALESCE($4, sector),
         division = COALESCE($5, division),
         status = COALESCE($6, status),
         updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        name,
        email,
        phone,
        normalizedDivision,
        normalizedDivision,
        status,
        id
      ]
    );

    if (result.rows.length === 0) {
      return error(res, "User not found", 404);
    }

    return success(res, "User updated", result.rows[0]);

  } catch (err: any) {
    console.error("Update user error:", err);
    return error(res, err.message || "Server error", 500);
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query("BEGIN");

    // 1. Delete associated client record (if exists)
    const clientRes = await client.query(`SELECT id FROM clients WHERE user_id = $1`, [id]);
    if (clientRes.rows.length > 0) {
      const clientId = clientRes.rows[0].id;
      // Delete sub-tables first
      await client.query(`DELETE FROM client_licenses WHERE client_id = $1`, [clientId]);
      await client.query(`DELETE FROM client_agreements WHERE client_id = $1`, [clientId]);
      await client.query(`DELETE FROM clients WHERE id = $1`, [clientId]);
    }

    // 2. Cleanup notifications
    await client.query(`DELETE FROM notifications WHERE user_id = $1`, [id]);

    // 3. Handle references in projects and invoices (setting to NULL instead of deleting entities)
    await client.query(`UPDATE projects SET manager_id = NULL WHERE manager_id = $1`, [id]);
    await client.query(`UPDATE projects SET client_id = NULL WHERE client_id = $1`, [id]);
    await client.query(`UPDATE invoices SET manager_id = NULL WHERE manager_id = $1`, [id]);
    await client.query(`UPDATE invoices SET client_id = NULL WHERE client_id = $1`, [id]);

    // 3.1 Handle references in quotations, leads, and credit_requests
    await client.query(`UPDATE quotations SET client_id = NULL WHERE client_id = $1`, [id]);
    await client.query(`UPDATE leads SET assigned_to = NULL WHERE assigned_to = $1`, [id]);
    await client.query(`UPDATE leads SET created_by = NULL WHERE created_by = $1`, [id]);
    await client.query(`UPDATE credit_requests SET requested_by = NULL WHERE requested_by = $1`, [id]);
    await client.query(`UPDATE credit_requests SET client_id = NULL WHERE client_id = $1`, [id]);

    // 4. Handle logs (setting user_id to NULL to keep system history)
    await client.query(`UPDATE activity_logs SET user_id = NULL WHERE user_id = $1`, [id]);
    await client.query(`UPDATE audit_logs SET user_id = NULL WHERE user_id = $1`, [id]);

    // 5. Final Hard Delete user
    const result = await client.query(
      `DELETE FROM users WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return error(res, "User not found", 404);
    }

    await client.query("COMMIT");
    return res.status(204).send();
  } catch (err: any) {
    if (client) await client.query("ROLLBACK");
    console.error("Delete user error:", err);
    return error(res, err.message || "Server error", 500);
  } finally {
    client.release();
  }
};