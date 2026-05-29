import { Request } from "express";
import { generateClientCode } from "../../utils/clientCodeGenerator";
import { getClientsRepo, updateClientRepo, deleteClientRepo, softDeleteClientRepo, addLicenseRepo, addAgreementRepo, getAgreementsRepo } from "./client.repository";
import { pool } from "../../config/db";

export const createClientService = async (data: any) => {
  const clientCode = await generateClientCode(data.division);

  const result = await pool.query(
    `INSERT INTO clients 
    (name, division, client_code, email, phone, address, contact_person, sector)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *`,
    [
      data.companyName,
      data.division,
      clientCode,
      data.email,
      data.phone,
      data.address,
      data.contactPerson,
      data.sector || data.division // Fallback to division if sector is not provided
    ]
  );

  const client = result.rows[0];

  // licenses
  if (data.licenses?.length) {
    for (const lic of data.licenses) {
      await pool.query(
        `INSERT INTO client_licenses (client_id, license_name)
         VALUES ($1,$2)`,
        [client.id, lic]
      );
    }
  }

  // agreements
  if (data.agreements?.length) {
    for (const agr of data.agreements) {
      await pool.query(
        `INSERT INTO client_agreements
        (client_id, title, file_url, start_date, end_date)
        VALUES ($1,$2,$3,$4,$5)`,
        [
          client.id,
          agr.title,
          agr.fileUrl,
          agr.startDate,
          agr.endDate,
        ]
      );
    }
  }

  return { clientCode };
};

export const getClientsService = async (req: Request) => {
  const {
    division,
    sector,
    search = "",
    page = "1",
    limit = "10",
  } = req.query;

  const user = (req as any).user;

  if (!user) throw new Error("Unauthorized");

  const isSuperAdmin = user.role === "SUPER_ADMIN";

  const filterDivision = isSuperAdmin
    ? (division as string) || null
    : user.division || null;

  const filterSector = isSuperAdmin
    ? (sector as string) || null
    : (user.sector || user.division) || null;

  const pageNumber = Math.max(parseInt(page as string) || 1, 1);
  const limitNumber = Math.min(Math.max(parseInt(limit as string) || 10, 1), 100);
  const offset = (pageNumber - 1) * limitNumber;

  const result = await getClientsRepo(
    filterDivision,
    search as string,
    limitNumber,
    offset,
    isSuperAdmin,
    filterSector
  );

  return {
    total: result.total,
    page: pageNumber,
    limit: limitNumber,
    data: result.data,
  };
};

export const getClientByIdService = async (clientId: number) => {
  const clientRes = await pool.query(
    `SELECT c.*, 
            u.qid, u.cr_number, u.computer_card, 
            u.start_date, u.renewal_date, u.contract_type,
            u.company_name as user_company_name,
            u.qid_doc_url, u.cr_doc_url, u.computer_card_doc_url, u.contract_doc_url
     FROM clients c
     LEFT JOIN users u ON c.user_id = u.id
     WHERE c.id = $1`,
    [clientId]
  );

  if (clientRes.rows.length === 0) {
    throw new Error("Client not found");
  }

  const client = clientRes.rows[0];

  const licensesRes = await pool.query(
    `SELECT license_name, license_type, license_number, expiry_date, document_url FROM client_licenses WHERE client_id = $1`,
    [clientId]
  );

  const agreementsRes = await pool.query(
    `SELECT title, file_url, start_date, end_date FROM client_agreements WHERE client_id = $1`,
    [clientId]
  );

  return {
    id: client.id,
    clientCode: client.client_code,
    division: client.division,
    companyName: client.name,
    sector: client.sector,
    email: client.email,
    phone: client.phone,
    address: client.address,
    contactPerson: client.contact_person,
    creditLimit: client.credit_limit,

    // Business documents from users table
    qid: client.qid,
    qidDocUrl: client.qid_doc_url,
    crNumber: client.cr_number,
    crDocUrl: client.cr_doc_url,
    computerCard: client.computer_card,
    computerCardDocUrl: client.computer_card_doc_url,
    contractDocUrl: client.contract_doc_url,
    
    startDate: client.start_date,
    renewalDate: client.renewal_date,
    contractType: client.contract_type,

    licenses: licensesRes.rows.map((l: any) => ({
      licenseName: l.license_name,
      licenseType: l.license_type,
      licenseNumber: l.license_number,
      expiryDate: l.expiry_date,
      documentUrl: l.document_url,
    })),

    agreements: agreementsRes.rows.map((a: any) => ({
      title: a.title,
      fileUrl: a.file_url,
      startDate: a.start_date,
      endDate: a.end_date,
    })),
  };
};

export const updateClientService = async (clientId: number, data: any) => {
  const fields: Record<string, any> = {};

  if (data.companyName !== undefined) fields.name = data.companyName;
  if (data.email) fields.email = data.email;
  if (data.phone) fields.phone = data.phone;
  if (data.address) fields.address = data.address;
  if (data.contactPerson) fields.contact_person = data.contactPerson;
  if (data.sector) fields.sector = data.sector;
  if (data.division) fields.division = data.division;

  if (Object.keys(fields).length === 0 && !data.qid && !data.crNumber && !data.computerCard && !data.licenses) {
    throw new Error("No valid fields provided");
  }

  // 1. Update the 'clients' table
  let updatedClient = null;
  if (Object.keys(fields).length > 0) {
    updatedClient = await updateClientRepo(clientId, fields);
  } else {
    const res = await pool.query("SELECT * FROM clients WHERE id = $1", [clientId]);
    updatedClient = res.rows[0];
  }

  if (!updatedClient) {
    throw new Error("Client not found");
  }

  // 2. Sync with the 'users' table if linked
  if (updatedClient.user_id) {
    const userFields: string[] = [];
    const userParams: any[] = [];
    let idx = 1;

    const mapping: Record<string, string> = {
      qid: data.qid,
      cr_number: data.crNumber,
      computer_card: data.computerCard,
      contract_type: data.contractType,
      start_date: data.startDate,
      renewal_date: data.renewalDate,
      company_name: data.companyName,
      address: data.address,
      phone: data.phone,
      division: data.division,
      sector: data.sector,
      qid_doc_url: data.qidDocUrl,
      cr_doc_url: data.crDocUrl,
      computer_card_doc_url: data.computerCardDocUrl,
      contract_doc_url: data.contractDocUrl
    };

    for (const [col, val] of Object.entries(mapping)) {
      if (val !== undefined) {
        userFields.push(`${col} = $${idx++}`);
        let mappedVal: any = val;
        if ((col === 'start_date' || col === 'renewal_date') && typeof val === 'string' && val.trim() === '') {
          mappedVal = null;
        }
        userParams.push(mappedVal);
      }
    }

    if (userFields.length > 0) {
      userParams.push(updatedClient.user_id);
      await pool.query(
        `UPDATE users SET ${userFields.join(", ")}, updated_at = NOW() WHERE id = $${idx}`,
        userParams
      );
    }
  }

  // 3. Update Licenses (Clear existing and re-insert)
  if (data.licenses && Array.isArray(data.licenses)) {
    await pool.query(`DELETE FROM client_licenses WHERE client_id = $1`, [clientId]);
    
    for (const lic of data.licenses) {
      if (typeof lic === 'string') {
        // Simple string license name
        await pool.query(
          `INSERT INTO client_licenses (client_id, license_name) VALUES ($1, $2)`,
          [clientId, lic]
        );
      } else if (typeof lic === 'object') {
        // Full license object
        await pool.query(
          `INSERT INTO client_licenses (client_id, license_name, license_type, license_number, expiry_date, document_url)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            clientId,
            lic.type || lic.name || 'License',
            lic.type,
            lic.number,
            lic.expiryDate || null,
            lic.documentUrl || null
          ]
        );
      }
    }
  }

  // 4. Update Agreements / Supporting Docs
  if (data.documents && Array.isArray(data.documents)) {
    for (const doc of data.documents) {
      await pool.query(
        `INSERT INTO client_agreements (client_id, title, file_url)
         VALUES ($1, $2, $3)`,
        [clientId, doc.originalName || doc.name || 'Supporting Document', doc.url]
      );
    }
  }

  return updatedClient;
};

export const deleteClientService = async (clientId: number) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Get the client first to find the user_id
    const clientRes = await client.query("SELECT user_id FROM clients WHERE id = $1", [clientId]);
    if (clientRes.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new Error("Client not found");
    }
    const userId = clientRes.rows[0].user_id;

    // 2. Cleanup sub-tables
    await client.query(`DELETE FROM client_licenses WHERE client_id = $1`, [clientId]);
    await client.query(`DELETE FROM client_agreements WHERE client_id = $1`, [clientId]);

    // 3. Nullify references in main entities (Mapped to clients.id)
    await client.query(`UPDATE boqs SET client_id = NULL WHERE client_id = $1`, [clientId]);
    await client.query(`UPDATE quotations SET client_id = NULL WHERE client_id = $1`, [clientId]);
    await client.query(`UPDATE proposals SET client_id = NULL WHERE client_id = $1`, [clientId]);
    await client.query(`UPDATE ledger_entries SET client_id = NULL WHERE client_id = $1`, [clientId]);
    await client.query(`UPDATE credit_requests SET client_id = NULL WHERE client_id = $1`, [clientId]);
    await client.query(`UPDATE users SET client_id = NULL WHERE client_id = $1`, [clientId]);

    // 4. Delete the client
    const deleteRes = await client.query("DELETE FROM clients WHERE id = $1 RETURNING *", [clientId]);
    if (deleteRes.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new Error("Client deletion failed");
    }

    // 5. Delete associated user if exists
    if (userId) {
      // Cleanup user references (Mapped to users.id)
      // Note: invoices and projects use users.id for their client_id field
      await client.query(`UPDATE projects SET client_id = NULL WHERE client_id = $1`, [userId]);
      await client.query(`UPDATE projects SET manager_id = NULL WHERE manager_id = $1`, [userId]);
      
      await client.query(`UPDATE invoices SET client_id = NULL WHERE client_id = $1`, [userId]);
      await client.query(`UPDATE invoices SET manager_id = NULL WHERE manager_id = $1`, [userId]);

      await client.query(`UPDATE boqs SET manager_id = NULL WHERE manager_id = $1`, [userId]);
      
      await client.query(`UPDATE leads SET assigned_to = NULL WHERE assigned_to = $1`, [userId]);
      await client.query(`UPDATE leads SET created_by = NULL WHERE created_by = $1`, [userId]);
      await client.query(`UPDATE activity_logs SET user_id = NULL WHERE user_id = $1`, [userId]);
      await client.query(`UPDATE audit_logs SET user_id = NULL WHERE user_id = $1`, [userId]);
      
      // Hard delete from link/notification tables
      await client.query(`DELETE FROM notifications WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM user_division_access WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM lead_follow_ups WHERE user_id = $1`, [userId]);

      await client.query("DELETE FROM users WHERE id = $1", [userId]);
      console.log(`[CLEANUP] Deleted associated user ${userId} for client ${clientId}`);
    }

    await client.query("COMMIT");
    return true;
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("DELETE CLIENT SERVICE ERROR:", err);
    throw err;
  } finally {
    client.release();
  }
};

export const softDeleteClientService = async (clientId: number) => {
  const client = await softDeleteClientRepo(clientId);
  if (!client) throw new Error("Client not found");
  return client;
};

export const addLicenseService = async (clientId: number, licenseName: string) => {
  if (!licenseName) throw new Error("License name is required");
  return await addLicenseRepo(clientId, licenseName);
};

export const addAgreementService = async (clientId: number, data: any) => {
  if (!data.title) throw new Error("Agreement title is required");
  return await addAgreementRepo(clientId, data);
};

export const getAgreementsService = async (clientId: number) => {
  return await getAgreementsRepo(clientId);
};
