import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { checkRole } from "../../middleware/role.middleware";
import { getClientLedger } from "./ledger.controller";

const router = Router();

router.get(
  "/:client_id",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ACCOUNTS"]),
  getClientLedger
);

export default router;