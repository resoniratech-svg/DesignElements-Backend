import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  notifyClientOfCreditRequest
} from "./notifications.controller";

const router = Router();

router.get("/", authMiddleware, getNotifications);
router.patch("/:id/read", authMiddleware, markAsRead);
router.patch("/read-all", authMiddleware, markAllAsRead);
router.post("/credit-request", authMiddleware, notifyClientOfCreditRequest);

export default router;