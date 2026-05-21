import { Router } from "express";
import {
  createActivityLog,
  getActivityLogs,
} from "./activity.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { checkRole } from "../../middleware/role.middleware";

const router = Router();

// 🔹 Create Activity
router.post("/", authMiddleware, createActivityLog);

// 🔹 Get Activity Logs (Restricted)
router.get(
  "/",
  authMiddleware,
  checkRole(["ADMIN", "FINANCE"]),
  getActivityLogs
);

export default router;