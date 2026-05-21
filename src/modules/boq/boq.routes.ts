import { Router } from "express";
import { 
    createBOQ, 
    getBOQs, 
    getBOQById, 
    updateBOQStatus, 
    deleteBOQ,
    updateBOQ
} from "./boq.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = Router();

// Apply auth to all BOQ routes
router.use(authMiddleware);

router.post("/", createBOQ);
router.get("/", getBOQs);
router.get("/:id", getBOQById);
router.put("/:id", updateBOQ);
router.put("/:id/status", updateBOQStatus);
router.delete("/:id", deleteBOQ);

export default router;
