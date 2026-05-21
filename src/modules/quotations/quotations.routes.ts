import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { checkRole } from "../../middleware/role.middleware";
import { 
  getQuotations, 
  getQuotationById, 
  createQuotation, 
  updateQuotation,
  deleteQuotation,
  getNextQuotationNumber
} from "./quotations.controller";

const router = Router();

/**
 * GET ALL QUOTATIONS
 * Allows: SUPER_ADMIN, ADMIN, PROJECT_MANAGER, CLIENT
 */
router.get(
  "/",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ADMIN", "ACCOUNTS", "PROJECT_MANAGER", "CLIENT"]),
  getQuotations
);

/**
 * GET QUOTATION BY ID
 */
router.get(
  "/:id",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ADMIN", "ACCOUNTS", "PROJECT_MANAGER", "CLIENT"]),
  getQuotationById
);

/**
 * CREATE QUOTATION
 */
router.post(
  "/",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER"]),
  createQuotation
);

/**
 * UPDATE QUOTATION
 */
router.put(
  "/:id",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER", "CLIENT"]),
  updateQuotation
);

/**
 * GET NEXT QUOTATION NUMBER
 */
router.get(
  "/next-number/:division",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER"]),
  getNextQuotationNumber
);

/**
 * DELETE QUOTATION
 */
router.delete(
  "/:id",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER"]),
  deleteQuotation
);

export default router;
