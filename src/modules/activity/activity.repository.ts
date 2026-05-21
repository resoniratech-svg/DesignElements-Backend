import { pool } from "../../config/db";
import { CreateActivityDTO } from "./activity.types";

// ================================
// INSERT ACTIVITY
// ================================
export const insertActivity = async (data: CreateActivityDTO) => {
  const query = `
    INSERT INTO activity_logs 
    (user_id, action, module, details, entity_id, entity_type, ip_address, user_agent)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *;
  `;

  const values = [
    data.userId || null,
    data.action,
    data.module,
    data.details || {},
    data.entityId || null,
    data.entityType || null,
    data.ipAddress || null,
    data.userAgent || null,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

// ================================
// FETCH ACTIVITIES
// ================================
export const fetchActivities = async (filters: any) => {
  let conditions: string[] = [];
  let values: any[] = [];
  let index = 1;

  if (filters.userId) {
    conditions.push(`user_id = $${index++}`);
    values.push(filters.userId);
  }

  if (filters.module) {
    conditions.push(`module = $${index++}`);
    values.push(filters.module);
  }

  if (filters.fromDate) {
    conditions.push(`created_at >= $${index++}`);
    values.push(filters.fromDate);
  }

  if (filters.toDate) {
    conditions.push(`created_at <= $${index++}`);
    values.push(filters.toDate);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  // ✅ Total count
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM activity_logs ${whereClause}`,
    values
  );

  const total = Number(countResult.rows[0].count);

  // ✅ Pagination
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;

  const result = await pool.query(
    `SELECT * FROM activity_logs
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${index++} OFFSET $${index++}`,
    [...values, limit, offset]
  );

  return {
    data: result.rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};