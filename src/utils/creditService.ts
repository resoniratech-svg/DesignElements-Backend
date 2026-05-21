import { PoolClient } from "pg";

/**
 * Calculates a client's total outstanding balance (Sum of Unpaid Invoices)
 * and verifies if a new transaction exceeds their credit limit.
 */
export const validateCreditLimit = async (
  client: PoolClient,
  clientId: number,
  newAmount: number
): Promise<{ 
  isExceeded: boolean; 
  currentOutstanding: number; 
  creditLimit: number 
}> => {
  // 1. Get current outstanding balance
  const outstandingRes = await client.query(
    `SELECT SUM(balance_amount) as total_outstanding
     FROM invoices
     WHERE (client_id = $1 OR client_id = (SELECT user_id FROM clients WHERE id = $1)) AND status != 'PAID'`,
    [clientId]
  );
  
  const currentOutstanding = parseFloat(outstandingRes.rows[0]?.total_outstanding || "0");

  // 2. Get client's credit limit (Check by ID or User ID)
  const clientRes = await client.query(
    `SELECT credit_limit FROM clients WHERE id = $1 OR user_id = $1`,
    [clientId]
  );
  
  const creditLimit = parseFloat(clientRes.rows[0]?.credit_limit || "10000.00");

  // 3. Compare Total Exposure vs Limit
  const totalExposure = currentOutstanding + newAmount;
  const isExceeded = totalExposure > creditLimit;

  return {
    isExceeded,
    currentOutstanding,
    creditLimit
  };
};
