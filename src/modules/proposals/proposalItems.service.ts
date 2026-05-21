import db from "../../config/db";

export const getProposalItems = async (proposalId: string) => {

  try {

    const query = `
      SELECT
        id,
        proposal_id,
        service_name,
        description,
        quantity,
        unit_price,
        amount
      FROM proposal_items
      WHERE proposal_id = $1
    `;

    const result = await db.query(query, [proposalId]);

    return result.rows;

  } catch (error: any) {

    console.error("Error fetching proposal items:", error);

    throw new Error("Failed to fetch proposal items");

  }

};