import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import {
  getClientProjects,
  getClientInvoices,
  getClientOutstanding,
  getClientLedger,
  getClientBillingSummary
} from "./portal.controller";

const router = Router();

router.get("/projects", authMiddleware, getClientProjects);
router.get("/invoices", authMiddleware, getClientInvoices);
router.get("/billing/invoices", authMiddleware, getClientInvoices);
router.get("/billing/summary", authMiddleware, getClientBillingSummary);
router.get("/outstanding", authMiddleware, getClientOutstanding);
router.get("/ledger", authMiddleware, getClientLedger);


export default router;