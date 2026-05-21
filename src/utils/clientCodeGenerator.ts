import { pool } from "../config/db";

const divisionPrefixMap: Record<string, string> = {
  TRADING: "TRD",
  CONTRACTING: "CON",
};

export const generateClientCode = async (division?: string) => {
  const normDivision = division ? division.trim().toUpperCase() : "GENERAL";
  const prefix = divisionPrefixMap[normDivision] || "GEN";

  const result = await pool.query(
    `SELECT client_code FROM clients 
     WHERE client_code LIKE $1 
     ORDER BY client_code DESC LIMIT 1`,
    [`${prefix}-%`]
  );

  let nextNumber = 1;
  if (result.rows.length > 0) {
    const lastCode = result.rows[0].client_code;
    const lastNumber = parseInt(lastCode.split("-")[1], 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
};