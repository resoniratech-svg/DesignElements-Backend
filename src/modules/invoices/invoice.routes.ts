import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { checkRole } from "../../middleware/role.middleware";
import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  restoreInvoice,
  updateInvoiceStatus,
  getOverdueInvoices,
  exportInvoices,
  sendReminder
} from "./invoice.controller";

const router = Router();

// Create Invoice
router.post(
  "/",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ACCOUNTS", "PROJECT_MANAGER", "DIRECTOR"]),
  createInvoice
);

// Get All Invoices
router.get(
  "/",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ACCOUNTS", "PROJECT_MANAGER", "DIRECTOR"]),
  getInvoices
);

// ✅ STATIC ROUTES FIRST (VERY IMPORTANT)
router.get(
  "/overdue",
  authMiddleware,
  getOverdueInvoices
);

router.get(
  "/export",
  authMiddleware,
  exportInvoices
);

// Get Invoice By ID
router.get(
  "/:id",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ACCOUNTS", "PROJECT_MANAGER", "DIRECTOR", "CLIENT"]),
  getInvoiceById
);

// Update Invoice
router.put(
  "/:id",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ACCOUNTS", "PROJECT_MANAGER", "DIRECTOR"]),
  updateInvoice
);

// Delete Invoice
router.delete(
  "/:id",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ACCOUNTS", "PROJECT_MANAGER", "DIRECTOR"]),
  deleteInvoice
);

// Restore Invoice
router.patch(
  "/:id/restore",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ACCOUNTS", "PROJECT_MANAGER", "DIRECTOR"]),
  restoreInvoice
);

// Update Status
router.patch(
  "/:id/status",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ACCOUNTS", "PROJECT_MANAGER", "DIRECTOR"]),
  updateInvoiceStatus
);

// Send Reminder
router.post(
  "/:id/remind",
  authMiddleware,
  sendReminder
);

export default router;