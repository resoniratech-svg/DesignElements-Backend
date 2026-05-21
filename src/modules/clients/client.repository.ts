import { pool } from "../../config/db";

export const getClientsRepo = async (
  division: string | null,
  search: string,
  limit: number,
  offset: number,
  isSuperAdmin: boolean,
  sector?: string
) => {
  let query = `SELECT * FROM clients WHERE is_deleted = false`;
  const params: any[] = [];

  if (division && !isSuperAdmin) {
    query += ` AND division::TEXT = $${params.length + 1}`;
    params.push(division);
  } else if (division && isSuperAdmin) {
    query += ` AND division::TEXT = $${params.length + 1}`;
    params.push(division);
  }

  if (sector) {
    query += ` AND sector::TEXT = $${params.length + 1}`;
    params.push(sector);
  }

  if (search) {
    query += ` AND (name ILIKE $${params.length + 1} OR email ILIKE $${
      params.length + 1
    })`;
    params.push(`%${search}%`);
  }

  // Count total row
  const totalRes = await pool.query(
    query.replace("SELECT *", "SELECT COUNT(*)"),
    params
  );
  const total = parseInt(totalRes.rows[0].count);

  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${
    params.length + 2
  }`;
  params.push(limit, offset);

  const dataRes = await pool.query(query, params);

  return { total, data: dataRes.rows };
};

export const updateClientRepo = async (clientId: number, fields: any) => {
  const setClauses = [];
  const params = [];
  let index = 1;

  for (const [key, value] of Object.entries(fields)) {
    setClauses.push(`${key} = $${index++}`);
    params.push(value);
  }

  params.push(clientId);
  const query = `UPDATE clients SET ${setClauses.join(
    ", "
  )}, updated_at = NOW() WHERE id = $${index} RETURNING *`;
  const result = await pool.query(query, params);
  return result.rows[0];
};

export const deleteClientRepo = async (clientId: number) => {
  const result = await pool.query(`DELETE FROM clients WHERE id = $1 RETURNING *`, [
    clientId,
  ]);
  return result.rows[0];
};

export const softDeleteClientRepo = async (clientId: number) => {
  const result = await pool.query(
    `UPDATE clients SET is_deleted = true, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [clientId]
  );
  return result.rows[0];
};

export const addLicenseRepo = async (clientId: number, licenseName: string) => {
  const result = await pool.query(
    `INSERT INTO client_licenses (client_id, license_name) VALUES ($1, $2) RETURNING *`,
    [clientId, licenseName]
  );
  return result.rows[0];
};

export const addAgreementRepo = async (clientId: number, data: any) => {
  const result = await pool.query(
    `INSERT INTO client_agreements (client_id, title, file_url, start_date, end_date) 
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [clientId, data.title, data.fileUrl, data.startDate, data.endDate]
  );
  return result.rows[0];
};

export const getAgreementsRepo = async (clientId: number) => {
  const result = await pool.query(
    `SELECT * FROM client_agreements WHERE client_id = $1`,
    [clientId]
  );
  return result.rows;
};
