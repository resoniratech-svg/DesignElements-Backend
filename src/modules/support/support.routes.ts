import { Router } from "express";
import { getChannels, createChannel, updateChannel, deleteChannel } from "./support.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { checkRole } from "../../middleware/role.middleware";

const router = Router();

// Allow any authenticated user to view channels
router.get("/", authMiddleware, getChannels);

// Restrict modifications to Super Admin only
router.post("/", authMiddleware, checkRole(["SUPER_ADMIN"]), createChannel);
router.put("/:id", authMiddleware, checkRole(["SUPER_ADMIN"]), updateChannel);
router.delete("/:id", authMiddleware, checkRole(["SUPER_ADMIN"]), deleteChannel);

export default router;
