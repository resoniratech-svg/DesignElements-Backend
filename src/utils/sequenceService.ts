import { PoolClient } from "pg";

const prefixMap: Record<string, string> = {
  TRADING: "TRD",
  CONTRACTING: "CON",
};

/**
 * Generates the next sequence number for a given division and document type.
 * e.g., CON-INV-001
 */
export const getNextSequence = async (
  client: PoolClient,
  division: string,
  type: "INV" | "QUO" | "PRJ"
): Promise<string> => {
  const divKey = (division || "CONTRACTING").toUpperCase().trim();
  const typeKey = (type || "INV").toUpperCase().trim();
  
  const result = await client.query(
    `INSERT INTO doc_counters (division, doc_type, last_number)
     VALUES ($1, $2, 1)
     ON CONFLICT (division, doc_type) 
     DO UPDATE SET last_number = doc_counters.last_number + 1
     RETURNING last_number`,
    [divKey, typeKey]
  );

  const lastNumber = result.rows[0].last_number;
  const prefix = prefixMap[divKey] || "CON";
  
  return `${prefix}-${typeKey}-${String(lastNumber).padStart(3, "0")}`;
};
