import { Router } from "express";
import { getMarketingDashboardStats } from "./marketing.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = Router();

router.get("/dashboard-stats", authMiddleware, getMarketingDashboardStats);

export default router;
