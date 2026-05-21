import { Request, Response } from "express";
import { pool } from "../../config/db";
import { success, error as errorResponse } from "../../utils/response";
import {
  getNotificationsService,
  markAsReadService,
  markAllAsReadService,
  createNotification
} from "./notifications.service";

export const getNotifications = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const data = await getNotificationsService(userId);

    return success(res, "Notifications fetched", data);
  } catch (err) {
    return errorResponse(res, "Server error", 500);
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    await markAsReadService(id);

    return success(res, "Notification marked as read");
  } catch (err) {
    return errorResponse(res, "Server error", 500);
  }
};

export const markAllAsRead = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    await markAllAsReadService(userId);

    return success(res, "All notifications marked as read");
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

export const notifyClientOfCreditRequest = async (req: any, res: Response) => {
  try {
    const { clientId, amount, reason } = req.body;
    if (!clientId) return errorResponse(res, "Client ID required", 400);

    // Look up the user_id associated with this client (with smart fallback if fk is missing)
    // We remove the strict 'role = CLIENT' check because some portal users have other roles (e.g. STAFF)
    const result = await pool.query(`
      SELECT 
        COALESCE(
          c.user_id,
          (SELECT id FROM users WHERE email = c.email LIMIT 1),
          (SELECT id FROM users WHERE LOWER(name) = LOWER(c.name) LIMIT 1),
          (SELECT id FROM users WHERE LOWER(name) LIKE '%' || LOWER(c.name) || '%' LIMIT 1)
        ) as user_id
      FROM clients c WHERE c.id = $1
    `, [clientId]);
    
    if (result.rows.length > 0 && result.rows[0].user_id) {
       const userId = result.rows[0].user_id;
       const notificationAmount = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 0;
       
       await createNotification({
         user_id: userId,
         title: "Credit Limit Alert",
         message: reason.includes("QAR") ? reason : `A credit limit request update: ${reason} (Amount: QAR ${notificationAmount.toLocaleString()})`,
         type: "INFO"
       });
       return success(res, "Client notified");
    }

    return success(res, "Credit request logged (Client has no linked portal account to notify)");
  } catch (error: any) {
    console.error("NOTIFY CLIENT ERROR:", error);
    return errorResponse(res, error.message, 500);
  }
};