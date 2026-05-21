import { Request, Response } from "express";
import { pool } from "../../config/db";
import { success, error } from "../../utils/response";

export const getClientLedger = async (req: Request, res: Response) => {
  try {

    const { client_id } = req.params;

    if (!client_id) {
      return error(res, "Client ID required", 400);
    }

    const result = await pool.query(
      `SELECT
        reference_type,
        reference_id,
        debit,
        credit,
        created_at
       FROM ledger_entries
       WHERE client_id = $1
       ORDER BY created_at DESC`,
      [client_id]
    );

    return success(res, "Ledger fetched successfully", result.rows);

  } catch (err) {

    console.error(err);
    return error(res, "Server error", 500);

  }
};