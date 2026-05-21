import { Router } from "express";
import { getAccountsDashboardStats } from "./accounts.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = Router();

router.get("/dashboard-stats", authMiddleware, getAccountsDashboardStats);

export default router;
