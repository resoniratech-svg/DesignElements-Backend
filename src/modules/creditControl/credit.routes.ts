import { Router } from "express";
import { getCreditSummary, getInvoices, addPayment } from "./credit.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = Router();

router.get("/summary", authMiddleware, getCreditSummary);
router.get("/invoices", authMiddleware, getInvoices);
router.post("/payments", authMiddleware, addPayment);

export default router;