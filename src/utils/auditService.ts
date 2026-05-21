import { PoolClient } from "pg";

/**
 * Creates an entry in the audit_logs table.
 * Designed to be used WITHIN an existing database transaction.
 */
export const createAuditLog = async (
  client: PoolClient,
  params: {
    userId: number;
    action: string;
    entityType: "INVOICE" | "QUOTATION" | "EXPENSE" | "PROJECT";
    entityId: string | number;
    oldValue: any;
    newValue: any;
  }
) => {
  const { userId, action, entityType, entityId, oldValue, newValue } = params;

  await client.query(
    `INSERT INTO audit_logs 
     (user_id, action, entity_type, entity_id, old_value, new_value)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      userId,
      action,
      entityType,
      entityId,
      JSON.stringify(oldValue),
      JSON.stringify(newValue)
    ]
  );
};
