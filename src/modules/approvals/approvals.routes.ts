import { Router } from "express";
import { getPendingDocuments, processApproval } from "./approvals.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { checkRole } from "../../middleware/role.middleware";

const router = Router();

// Rule 2: Accountants (ACCOUNTS role) are also authorized to approve expenses/credit requests
router.get("/pending", authMiddleware, checkRole(["ADMIN", "SUPER_ADMIN", "ACCOUNTS"]), getPendingDocuments);
router.post("/process", authMiddleware, checkRole(["ADMIN", "SUPER_ADMIN", "ACCOUNTS"]), processApproval);

export default router;