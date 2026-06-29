import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { checkRole } from "../../middleware/role.middleware";
import { getPermissions, savePermissions } from "./permissions.controller";

const router = Router();

router.get("/", authMiddleware, getPermissions);
router.put("/", authMiddleware, checkRole(["SUPER_ADMIN"]), savePermissions);
router.post("/", authMiddleware, checkRole(["SUPER_ADMIN"]), savePermissions);

export default router;
