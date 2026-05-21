import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { getPMDashboardStats } from "./projects.controller";

const router = Router();

router.get("/dashboard-stats", authMiddleware, getPMDashboardStats);

export default router;
