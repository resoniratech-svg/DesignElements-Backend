import { Request, Response } from "express";
import { pool } from "../../config/db";
import { success, error } from "../../utils/response";

// Helper to map DB row to JS Object
const mapEmployee = (req: any) => {
  if (!req) return null;
  return {
    ...req,
    company: req.company,
    joinedDate: req.joined_date,
    qidNumber: req.qid_number,
    qidExpiry: req.qid_expiry,
    passportNumber: req.passport_number,
    passportExpiry: req.passport_expiry
  };
};

export const getEmployees = async (req: Request, res: Response) => {
  try {
    const division = req.query.division as string;
    
    // 1. Fetch from employees table
    let empQuery = "SELECT * FROM employees";
    let params = [];
    if (division && division !== "all") {
      empQuery += " WHERE UPPER(division) = UPPER($1)";
      params.push(division);
    }
    const empResult = await pool.query(empQuery, params);
    const employees = empResult.rows.map(row => ({
      ...mapEmployee(row),
      id: `EMP-${row.id}`, // Prefix to avoid collisions with users table
      _source: 'employees'
    }));

    // 2. Fetch from users table (excluding Super Admin)
    let userQuery = `
      SELECT 
        id, name, email, phone, role, division, status, address,
        start_date as "joined_date"
      FROM users 
      WHERE is_deleted = false AND role != 'SUPER_ADMIN'
    `;
    if (division && division !== "all") {
      userQuery += " AND UPPER(division) = UPPER($1)";
    }
    const userResult = await pool.query(userQuery, params);
    const userEmployees = userResult.rows;

    // Combined & De-duplicate by email/name
    // If someone is in BOTH tables, we prefer the 'employees' table version
    const combined = [...employees];
    const seenEmails = new Set(employees.map(e => e.email?.toLowerCase()).filter(Boolean));
    const seenNames = new Set(employees.map(e => e.name?.toLowerCase()).filter(Boolean));

    for (const u of userEmployees) {
      const email = u.email?.toLowerCase();
      const name = u.name?.toLowerCase();
      if (!seenEmails.has(email) && !seenNames.has(name)) {
        combined.push({
          ...u,
          id: `USR-${u.id}`, // Prefix to avoid collisions
          joinedDate: u.joined_date,
          _source: 'users'
        });
        if (email) seenEmails.add(email);
        if (name) seenNames.add(name);
      }
    }

    return success(res, "Employees fetched successfully", combined);
  } catch (err: any) {
    return error(res, err.message, 500);
  }
};

export const getEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    
    // Handle prefixed IDs
    if (id.startsWith("EMP-")) {
      const numericId = id.replace("EMP-", "");
      const result = await pool.query("SELECT * FROM employees WHERE id = $1", [numericId]);
      if (result.rows.length === 0) return error(res, "Employee not found", 404);
      return success(res, "Employee fetched successfully", { ...mapEmployee(result.rows[0]), id });
    }

    if (id.startsWith("USR-")) {
      const numericId = id.replace("USR-", "");
      const userResult = await pool.query(
        `SELECT 
          id, name, email, phone, role, division, status,
          start_date as "joined_date",
          renewal_date as "qid_expiry",
          qid as "qid_number",
          qid_doc_url, cr_doc_url, computer_card_doc_url, contract_doc_url
        FROM users WHERE id = $1 AND is_deleted = false`,
        [numericId]
      );

      if (userResult.rows.length === 0) return error(res, "Employee not found", 404);
      const user = userResult.rows[0];
    
    // Map user documents to EmployeeDocument format
    const documents = [];
    if (user.qid_doc_url) {
      documents.push({
        type: "QID",
        number: user.qid_number || "N/A",
        expiryDate: user.qid_expiry,
        fileUrl: user.qid_doc_url,
        fileName: "QID Document"
      });
    }
    if (user.cr_doc_url) {
      documents.push({
        type: "CR Number",
        number: "N/A",
        expiryDate: user.qid_expiry,
        fileUrl: user.cr_doc_url,
        fileName: "CR Document"
      });
    }

    const employeeData = {
      ...user,
      joinedDate: user.joined_date,
      qidNumber: user.qid_number,
      qidExpiry: user.qid_expiry,
      documents: documents
    };

    return success(res, "Employee fetched successfully (from users table)", employeeData);
    }

    // Default: Handle numeric IDs (assuming they are from the 'employees' table)
    const result = await pool.query("SELECT * FROM employees WHERE id = $1", [id]);
    if (result.rows.length === 0) return error(res, "Employee not found", 404);
    
    return success(res, "Employee fetched successfully", mapEmployee(result.rows[0]));
    } catch (err: any) {
    return error(res, err.message, 500);
  }
};

export const createEmployee = async (req: Request, res: Response) => {
  try {
    console.log("[DEBUG] createEmployee body:", req.body);
    const { 
      name, role, division, status, company,
      joinedDate,
      qidNumber, qidExpiry,
      passportNumber, passportExpiry,
      email, phone, address, documents
    } = req.body;

    let finalQidNumber = qidNumber;
    let finalQidExpiry = qidExpiry;
    let finalPassportNumber = passportNumber;
    let finalPassportExpiry = passportExpiry;

    if (documents && Array.isArray(documents)) {
      const qidDoc = documents.find((d: any) => d.type === 'QID');
      if (qidDoc) {
        finalQidNumber = qidDoc.number || finalQidNumber;
        finalQidExpiry = qidDoc.expiryDate || finalQidExpiry;
      }
      const passportDoc = documents.find((d: any) => d.type === 'Passport');
      if (passportDoc) {
        finalPassportNumber = passportDoc.number || finalPassportNumber;
        finalPassportExpiry = passportDoc.expiryDate || finalPassportExpiry;
      }
    }

    const result = await pool.query(
      `INSERT INTO employees 
        (name, role, division, status, company, joined_date, qid_number, qid_expiry, passport_number, passport_expiry, email, phone, address, documents) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
       RETURNING *`,
      [
        name, role, division, status, company,
        joinedDate,
        finalQidNumber, finalQidExpiry,
        finalPassportNumber, finalPassportExpiry,
        email, phone, address, JSON.stringify(documents || [])
      ]
    );
    
    console.log("[DEBUG] createEmployee result:", result.rows[0]);
    return success(res, "Employee created successfully", mapEmployee(result.rows[0]));
  } catch (err: any) {
    console.error("[ERROR] createEmployee:", err);
    return error(res, err.message, 500);
  }
};

export const updateEmployee = async (req: Request, res: Response) => {
  try {
    let { id } = req.params as { id: string };
    const { 
      name, role, division, status, company,
      joinedDate,
      qidNumber, qidExpiry,
      passportNumber, passportExpiry,
      email, phone, address, documents
    } = req.body;

    if (id.startsWith("USR-")) {
      const numericId = id.replace("USR-", "");
      const result = await pool.query(
        `UPDATE users SET 
          name = COALESCE($1, name),
          phone = COALESCE($2, phone),
          division = COALESCE($3, division),
          status = COALESCE($4, status),
          company_name = COALESCE($5, company_name),
          start_date = $6,
          qid = COALESCE($7, qid),
          renewal_date = $8,
          updated_at = NOW()
        WHERE id = $9 RETURNING *`,
        [
          name, phone, division, status, company,
          joinedDate, qidNumber, qidExpiry, numericId
        ]
      );
      if (result.rows.length === 0) return error(res, "User-sourced employee not found", 404);
      return success(res, "User-sourced employee updated successfully", result.rows[0]);
    }

    const numericId = id.replace("EMP-", "");
    console.log(`[DEBUG] updateEmployee ID: ${numericId}, body:`, req.body);

    let finalQidNumber = qidNumber;
    let finalQidExpiry = qidExpiry;
    let finalPassportNumber = passportNumber;
    let finalPassportExpiry = passportExpiry;

    if (documents && Array.isArray(documents)) {
      const qidDoc = documents.find((d: any) => d.type === 'QID');
      if (qidDoc) {
        finalQidNumber = qidDoc.number || finalQidNumber;
        finalQidExpiry = qidDoc.expiryDate || finalQidExpiry;
      }
      const passportDoc = documents.find((d: any) => d.type === 'Passport');
      if (passportDoc) {
        finalPassportNumber = passportDoc.number || finalPassportNumber;
        finalPassportExpiry = passportDoc.expiryDate || finalPassportExpiry;
      }
    }

    const result = await pool.query(
      `UPDATE employees SET 
        name = $1, role = $2, division = $3, status = $4, company = $5, joined_date = $6, 
        qid_number = $7, qid_expiry = $8, passport_number = $9, passport_expiry = $10,
        email = $11, phone = $12, address = $13, documents = $14,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $15 RETURNING *`,
      [
        name, role, division, status, company,
        joinedDate,
        finalQidNumber, finalQidExpiry,
        finalPassportNumber, finalPassportExpiry,
        email, phone, address, JSON.stringify(documents || []),
        numericId
      ]
    );

    if (result.rows.length === 0) {
      return error(res, "Employee not found", 404);
    }

    console.log("[DEBUG] updateEmployee result:", result.rows[0]);
    return success(res, "Employee updated successfully", mapEmployee(result.rows[0]));
  } catch (err: any) {
    console.error("[ERROR] updateEmployee:", err);
    return error(res, err.message, 500);
  }
};

export const deleteEmployee = async (req: Request, res: Response) => {
  try {
    let { id } = req.params as { id: string };

    if (id.startsWith("USR-")) {
      const numericId = id.replace("USR-", "");
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        
        // Cleanup associated client record if it exists
        const clientRes = await client.query(`SELECT id FROM clients WHERE user_id = $1`, [numericId]);
        if (clientRes.rows.length > 0) {
          const clientId = clientRes.rows[0].id;
          await client.query(`DELETE FROM client_licenses WHERE client_id = $1`, [clientId]);
          await client.query(`DELETE FROM client_agreements WHERE client_id = $1`, [clientId]);
          await client.query(`DELETE FROM clients WHERE id = $1`, [clientId]);
        }

        // Hard delete the user
        const result = await client.query("DELETE FROM users WHERE id = $1 RETURNING *", [numericId]);
        if (result.rows.length === 0) {
          await client.query("ROLLBACK");
          return error(res, "User-sourced employee not found", 404);
        }

        await client.query("COMMIT");
        return success(res, "User-sourced employee deleted successfully");
      } catch (err: any) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }

    const numericId = id.replace("EMP-", "");
    const result = await pool.query("DELETE FROM employees WHERE id = $1 RETURNING *", [numericId]);
    if (result.rows.length === 0) return error(res, "Employee not found", 404);
    
    return success(res, "Employee deleted successfully");
  } catch (err: any) {
    console.error("DELETE EMPLOYEE ERROR:", err);
    return error(res, err.message, 500);
  }
};

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const division = req.query.division as string;
    let filter = "";
    let userFilter = " AND role != 'SUPER_ADMIN'";
    let params = [];

    // 1. Fetch from employees table
    let empQuery = "SELECT * FROM employees";
    if (division && division !== "all") {
      empQuery += " WHERE UPPER(division) = UPPER($1)";
      params.push(division);
    }
    const empResult = await pool.query(empQuery, params);
    const employees = empResult.rows;

    // 2. Fetch from users table
    let userQuery = `SELECT * FROM users WHERE is_deleted = false AND role != 'SUPER_ADMIN'`;
    if (division && division !== "all") {
      userQuery += " AND UPPER(division) = UPPER($1)";
    }
    const userResult = await pool.query(userQuery, params);
    const users = userResult.rows;

    // Combine & De-duplicate
    const combined = [...employees];
    const seenEmails = new Set(employees.map(e => e.email?.toLowerCase()).filter(Boolean));
    const seenNames = new Set(employees.map(e => e.name?.toLowerCase()).filter(Boolean));

    for (const u of users) {
      const email = u.email?.toLowerCase();
      const name = u.name?.toLowerCase();
      if (!seenEmails.has(email) && !seenNames.has(name)) {
        combined.push(u);
        if (email) seenEmails.add(email);
        if (name) seenNames.add(name);
      }
    }

    const totalCount = combined.length;
    const activeCount = combined.filter(e => e.status === 'Active').length;
    
    // Expiring & Expired docs logic (simplified for combined view)
    const expiringQuery = `
      SELECT COUNT(*) FROM employees 
      WHERE ((qid_expiry <= NOW() + INTERVAL '30 days' AND qid_expiry >= NOW()) 
         OR (passport_expiry <= NOW() + INTERVAL '30 days' AND passport_expiry >= NOW()))
         ${division && division !== "all" ? " AND UPPER(division) = UPPER($1)" : ""}
    `;
    const userExpiringQuery = `
      SELECT COUNT(*) FROM users 
      WHERE renewal_date <= NOW() + INTERVAL '30 days' AND renewal_date >= NOW()
      AND is_deleted = false ${userFilter}
    `;
    
    const expiringRes = await pool.query(expiringQuery, params);
    const userExpiringRes = await pool.query(userExpiringQuery, params);
    const expiringDocsCount = parseInt(expiringRes.rows[0].count) + parseInt(userExpiringRes.rows[0].count);

    const expiredQuery = `
      SELECT COUNT(*) FROM employees 
      WHERE (qid_expiry < NOW() OR passport_expiry < NOW())
         ${division && division !== "all" ? " AND UPPER(division) = UPPER($1)" : ""}
    `;
    const userExpiredQuery = `
      SELECT COUNT(*) FROM users 
      WHERE renewal_date < NOW() AND is_deleted = false ${userFilter}
    `;
    const expiredRes = await pool.query(expiredQuery, params);
    const userExpiredRes = await pool.query(userExpiredQuery, params);
    const expiredDocsCount = parseInt(expiredRes.rows[0].count) + parseInt(userExpiredRes.rows[0].count);

    // Recent employees (Combined)
    const recentEmpRes = await pool.query(`SELECT * FROM employees ${filter} ORDER BY created_at DESC LIMIT 5`, params);
    const recentUserRes = await pool.query(`SELECT id, name, division, role, start_date as "joined_date", status FROM users WHERE is_deleted = false ${userFilter} ORDER BY created_at DESC LIMIT 5`, params);
    
    const combinedRecent = [
      ...recentEmpRes.rows.map(mapEmployee),
      ...recentUserRes.rows.map(row => ({ ...row, joinedDate: row.joined_date }))
    ].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 5);

    const data = {
      stats: {
        totalEmployees: totalCount,
        activeEmployees: activeCount,
        expiringDocs: expiringDocsCount,
        expiredDocs: expiredDocsCount
      },
      alerts: [], // Alerts logic can be expanded if needed
      recentEmployees: combinedRecent
    };

    return success(res, "Employee dashboard data fetched", data);
  } catch (err: any) {
    return error(res, err.message, 500);
  }
};
