import db from "../../config/db";

export const generateProposalNumber = async (): Promise<string> => {
  try {

    const year = new Date().getFullYear();

    const query = `
      SELECT COUNT(*) 
      FROM proposals
      WHERE proposal_number LIKE $1
    `;

    const result = await db.query(query, [`PRO-${year}-%`]);

    const count = parseInt(result.rows[0].count, 10) + 1;

    const proposalNumber = `PRO-${year}-${String(count).padStart(4, "0")}`;

    return proposalNumber;

  } catch (error: any) {

    console.error("Error generating proposal number:", error);

    throw new Error("Failed to generate proposal number");

  }
};