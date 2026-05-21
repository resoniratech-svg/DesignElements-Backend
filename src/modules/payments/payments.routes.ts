import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import {
  createPayment,
  getPaymentsByInvoice,
  deletePayment,
  updatePayment,
  getAllPayments
} from "./payments.controller";

const router = Router();

// ==============================
// CREATE PAYMENT
// ==============================
router.post("/", authMiddleware, createPayment);

// ==============================
// GET ALL PAYMENTS
// ==============================
router.get("/", authMiddleware, getAllPayments);

// ==============================
// GET PAYMENTS BY INVOICE
// (make path explicit to avoid conflict)
// ==============================
router.get("/invoice/:invoice_id", authMiddleware, getPaymentsByInvoice);

// ==============================
// UPDATE PAYMENT
// ==============================
router.put("/:id", authMiddleware, updatePayment);

// ==============================
// DELETE PAYMENT
// ==============================
router.delete("/:id", authMiddleware, deletePayment);

export default router;