import { Router } from "express";
import { getAdminDashboardStats } from "./dashboard.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = Router();

router.get("/dashboard-stats", authMiddleware, getAdminDashboardStats);

export default router;