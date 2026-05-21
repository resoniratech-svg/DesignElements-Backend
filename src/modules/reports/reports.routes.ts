import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { checkRole } from "../../middleware/role.middleware";

import {
  getOutstandingInvoices,
  revenueReport,
  getClientSummary
} from "./reports.controller";

const router = Router();

/**
 * Outstanding invoices
 */
router.get(
  "/outstanding",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ACCOUNTS"]),
  getOutstandingInvoices
);

/**
 * Revenue report
 */
router.get(
  "/revenue",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ACCOUNTS"]),
  revenueReport
);

/**
 * Client summary
 */
router.get(
  "/client-summary/:client_id",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ACCOUNTS"]),
  getClientSummary
);

export default router;