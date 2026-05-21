import db from "../../config/db";
import { generateProposalNumber } from "./proposalNumber.service";


// GET ALL PROPOSALS
export const getProposals = async () => {
  try {
    const query = `
      SELECT
        p.id,
        p.proposal_number,
        c.name AS client_name,
        p.project_title,   -- ✅ FIXED
        p.proposal_date,
        p.valid_until,
        p.status
      FROM proposals p
      JOIN clients c ON p.client_id = c.id
      ORDER BY p.proposal_date DESC
    `;

    const result = await db.query(query);
    return result.rows;

  } catch (error: any) {
    console.error("❌ Error fetching proposals:", error);
    throw new Error(error.message || "Failed to fetch proposals");
  }
};
// GET PROPOSAL BY ID
export const getProposalById = async (id: string) => {
  try {
    const proposalQuery = `
      SELECT *
      FROM proposals
      WHERE id = $1
    `;

    const proposalResult = await db.query(proposalQuery, [id]);

    if (proposalResult.rows.length === 0) {
      throw new Error("Proposal not found");
    }

    const itemsQuery = `
      SELECT *
      FROM proposal_items
      WHERE proposal_id = $1
    `;

    const itemsResult = await db.query(itemsQuery, [id]);

    return {
      proposal: proposalResult.rows[0],
      items: itemsResult.rows
    };

  } catch (error: any) {
    console.error("❌ Error fetching proposal:", error);
    throw new Error(error.message || "Failed to fetch proposal");
  }
};



// CREATE PROPOSAL
export const createProposal = async (data: any, userId: string) => {
  try {

    if (!data.client_id || !data.project_title) {
      throw new Error("Missing required fields");
    }

    if (!data.items || !Array.isArray(data.items)) {
      throw new Error("Items are required");
    }

    const proposalNumber = await generateProposalNumber();

    let totalAmount = 0;

    data.items.forEach((item: any) => {
      item.quantity = Number(item.quantity || 0);
      item.unit_price = Number(item.unit_price || 0);
      item.amount = item.quantity * item.unit_price;
      totalAmount += item.amount;
    });

    const proposalQuery = `
      INSERT INTO proposals
      (proposal_number, client_id, project_title, proposal_date, valid_until, status)
      VALUES ($1,$2,$3,NOW(),$4,$5)
      RETURNING *
    `;

    const proposalResult = await db.query(proposalQuery, [
      proposalNumber,
      data.client_id,
      data.project_title,        // ✅ FIXED
      data.valid_until,          // ✅ FIXED
      data.status || "DRAFT"
    ]);

    const proposalId = proposalResult.rows[0].id;

    for (const item of data.items) {
      await db.query(
        `INSERT INTO proposal_items
         (proposal_id, description, quantity, unit_price, total)
         VALUES ($1,$2,$3,$4,$5)`,
        [
          proposalId,
          item.description,
          item.quantity,
          item.unit_price,
          item.amount
        ]
      );
    }

    return proposalResult.rows[0];

  } catch (error: any) {
    console.error("❌ Error creating proposal:", error);
    throw new Error(error.message || "Failed to create proposal");
  }
};



// UPDATE PROPOSAL
export const updateProposal = async (id: string, data: any) => {
  const client = await db.connect();

  try {

    if (!data.items || !Array.isArray(data.items)) {
      throw new Error("Items are required for update");
    }

    await client.query("BEGIN");

    let totalAmount = 0;

    data.items.forEach((item: any) => {
      item.quantity = Number(item.quantity || 0);
      item.unit_price = Number(item.unit_price || 0);
      item.amount = item.quantity * item.unit_price;
      totalAmount += item.amount;
    });

    await client.query(
      `UPDATE proposals
       SET project_title=$1,
           valid_until=$2,
           status=$3
       WHERE id=$4`,
      [
        data.project_title,
        data.valid_until,
        data.status,
        id
      ]
    );

    await client.query(
      `DELETE FROM proposal_items WHERE proposal_id=$1`,
      [id]
    );

    for (const item of data.items) {
      await client.query(
        `INSERT INTO proposal_items
         (proposal_id, description, quantity, unit_price, total)
         VALUES ($1,$2,$3,$4,$5)`,
        [
          id,
          item.description,
          item.quantity,
          item.unit_price,
          item.amount
        ]
      );
    }

    await client.query("COMMIT");

    return { message: "Updated successfully" };

  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("❌ Error updating proposal:", error);
    throw new Error(error.message || "Failed to update proposal");
  } finally {
    client.release();
  }
};