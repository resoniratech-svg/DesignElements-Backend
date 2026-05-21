import { pool } from "../../config/db";

export const createNotification = async ({
  user_id,
  title,
  message,
  type,
  reference_id
}: any) => {
  await pool.query(
    `INSERT INTO notifications
     (user_id, title, message, type, reference_id)
     VALUES ($1,$2,$3,$4,$5)`,
    [user_id, title, message, type, reference_id]
  );
};

export const getNotificationsService = async (userId: number) => {
  const result = await pool.query(
    `SELECT *
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
};

export const markAsReadService = async (id: number) => {
  await pool.query(
    `UPDATE notifications
     SET is_read = TRUE
     WHERE id = $1`,
    [id]
  );
};

export const markAllAsReadService = async (userId: number) => {
  await pool.query(
    `UPDATE notifications
     SET is_read = TRUE
     WHERE user_id = $1`,
    [userId]
  );
};