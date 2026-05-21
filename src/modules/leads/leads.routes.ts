import { Router } from "express";
import { 
    getLeads, 
    createLead, 
    updateLeadStatus, 
    addFollowUp, 
    convertLead,
    getLeadFollowUps,
    getLead,
    updateLead,
    deleteLead
} from "./leads.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = Router();

router.get("/", authMiddleware, getLeads);
router.post("/", authMiddleware, createLead);
router.patch("/:id/status", authMiddleware, updateLeadStatus);
router.post("/:id/follow-up", authMiddleware, addFollowUp);
router.post("/:id/convert", authMiddleware, convertLead);
router.get("/:id/follow-ups", authMiddleware, getLeadFollowUps);
router.get("/:id", authMiddleware, getLead);
router.patch("/:id", authMiddleware, updateLead);
router.delete("/:id", authMiddleware, deleteLead);

export default router;
