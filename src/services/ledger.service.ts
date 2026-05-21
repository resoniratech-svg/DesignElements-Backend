import { PoolClient } from "pg";

/**
 * Posts a balanced double-entry (debit row + credit row) to ledger_entries
 * within an existing DB transaction client.
 *
 * MUST be called inside an active BEGIN/COMMIT block.
 * If this INSERT fails, the caller's transaction will roll back everything atomically.
 */
export const postBalancedLedgerEntry = async (
  client: PoolClient,
  params: {
    referenceType: string;
    referenceId: number | string;
    clientId: number | null;
    amount: number;
  }
): Promise<void> => {
  const { referenceType, referenceId, clientId, amount } = params;

  // Debit row — money going out / receivable being raised
  await client.query(
    `INSERT INTO ledger_entries
     (client_id, reference_type, reference_id, debit, credit)
     VALUES ($1, $2, $3, $4, 0)`,
    [clientId, `${referenceType}_DEBIT`, referenceId, amount]
  );

  // Credit row — money coming in / payable being raised
  await client.query(
    `INSERT INTO ledger_entries
     (client_id, reference_type, reference_id, debit, credit)
     VALUES ($1, $2, $3, 0, $4)`,
    [clientId, `${referenceType}_CREDIT`, referenceId, amount]
  );
};
