import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { checkRole } from "../../middleware/role.middleware";
import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  deleteInvoiceDeliveryNote,
  deleteInvoiceCertificate,
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

// Delete Invoice (Soft Delete)
router.delete(
  "/:id",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ACCOUNTS", "PROJECT_MANAGER", "DIRECTOR"]),
  deleteInvoice
);

// Delete Delivery Note (Soft Delete)
router.delete(
  "/:id/delivery-note",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ACCOUNTS", "PROJECT_MANAGER", "DIRECTOR"]),
  deleteInvoiceDeliveryNote
);

// Delete Completion Certificate (Soft Delete)
router.delete(
  "/:id/certificate",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ACCOUNTS", "PROJECT_MANAGER", "DIRECTOR"]),
  deleteInvoiceCertificate
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