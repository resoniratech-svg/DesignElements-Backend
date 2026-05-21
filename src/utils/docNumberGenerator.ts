import { PoolClient } from "pg";

const prefixMap: any = {
  TRADING: "TRD",
  CONTRACTING: "CON",
};

export const generateDocNumber = async (
  client: PoolClient,
  division: string,
  type: "INV" | "QUO"
) => {
  const result = await client.query(
    `SELECT * FROM doc_counters
     WHERE division = $1 AND doc_type = $2
     FOR UPDATE`,
    [division, type]
  );

  let counter;

  if (result.rows.length === 0) {
    const insert = await client.query(
      `INSERT INTO doc_counters (division, doc_type, last_number)
       VALUES ($1,$2,1)
       RETURNING *`,
      [division, type]
    );
    counter = insert.rows[0];
  } else {
    const update = await client.query(
      `UPDATE doc_counters
       SET last_number = last_number + 1
       WHERE division = $1 AND doc_type = $2
       RETURNING *`,
      [division, type]
    );
    counter = update.rows[0];
  }

  const prefix = prefixMap[division];

  return `${prefix}-${type}-${String(counter.last_number).padStart(3, "0")}`;
};