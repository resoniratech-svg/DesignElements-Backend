import { pool } from "../../config/db";
import { ApprovalStatus } from "../../types/erp";
import { postBalancedLedgerEntry } from "../../services/ledger.service";

export const getPendingApprovalsService = async (divisionId?: string, status: string = 'PENDING') => {
  const normStatus = status.toUpperCase();
  const whereClause = divisionId ? `AND division = $1` : '';
  const params = divisionId ? [divisionId] : [];

  // 1. Fetch Invoices matching status
  const invoices = await pool.query(
    `SELECT 'INVOICE' as type, id, invoice_number as number, total_amount, division as division_id, created_at
     FROM invoices 
     WHERE (TRIM(UPPER(approval_status::text)) = '${normStatus}' OR (approval_status IS NULL AND '${normStatus}' = 'PENDING')) 
     AND (is_deleted = false OR is_deleted IS NULL) ${whereClause.replace('division', 'TRIM(UPPER(division::text))')}`,
    params
  );

  // 2. Fetch Quotations matching status
  const quotations = await pool.query(
    `SELECT 'QUOTATION' as type, id, qtn_number as number, total_amount, division as division_id, created_at
     FROM quotations 
     WHERE (TRIM(UPPER(status::text)) = '${normStatus}' OR (TRIM(UPPER(status::text)) = 'PENDING_APPROVAL' AND '${normStatus}' = 'PENDING'))
     ${whereClause.replace('division', 'TRIM(UPPER(division::text))')}`,
    params
  );

  // 3. Fetch Expenses matching status
  const expenses = await pool.query(
    `SELECT 'EXPENSE' as type, id, category as number, total_amount, 'ALL' as division_id, created_at
     FROM internal_expenses 
     WHERE (TRIM(UPPER(approval_status::text)) = '${normStatus}' OR (TRIM(UPPER(approval_status::text)) = 'PENDING_APPROVAL' AND '${normStatus}' = 'PENDING')) 
     AND (is_deleted = false OR is_deleted IS NULL)`,
    []
  );

  return [
    ...invoices.rows,
    ...quotations.rows,
    ...expenses.rows
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const processApprovalService = async (
  entityType: string, 
  entityId: number, 
  status: ApprovalStatus, 
  userId: string, 
  comments?: string
) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let table = '';
    let statusCol = 'approval_status';
    
    switch (entityType) {
      case 'INVOICE': table = 'invoices'; break;
      case 'QUOTATION': table = 'quotations'; statusCol = 'status'; break;
      case 'EXPENSE': table = 'internal_expenses'; break;
      default: throw new Error('Invalid entity type');
    }

    const result = await client.query(
      `UPDATE ${table} SET ${statusCol} = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, entityId]
    );

    if (result.rows.length === 0) throw new Error(`${entityType} not found`);

    // Rule 1 + 4: When an EXPENSE is APPROVED, post a balanced ledger entry
    // atomically inside this same transaction. Rollback if ledger fails.
    if (entityType === 'EXPENSE' && status === ApprovalStatus.APPROVED) {
      const expense = result.rows[0];
      const amount = Number(expense.total_amount || 0);
      if (amount > 0) {
        await postBalancedLedgerEntry(client, {
          referenceType: 'EXPENSE',
          referenceId: entityId,
          clientId: null, // internal expense — no client
          amount
        });
      }
    }

    // Record decision in a unified approvals log if exists, or activity_logs
    await client.query(
      `INSERT INTO activity_logs (user_id, action, module, entity_id, entity_type, details) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, `DECISION_${status}`, 'APPROVAL', entityId, entityType, JSON.stringify({ status, comments })]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};