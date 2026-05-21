import { Router } from "express";
import * as controller from "./proposals.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = Router();


// GET ALL PROPOSALS
router.get(
  "/",
  authMiddleware,
  controller.getProposals
);


// GET PROPOSAL BY ID
router.get(
  "/:id",
  authMiddleware,
  controller.getProposalById
);


// CREATE PROPOSAL
router.post(
  "/",
  authMiddleware,
  controller.createProposal
);


// UPDATE PROPOSAL
router.put(
  "/:id",
  authMiddleware,
  controller.updateProposal
);


// GENERATE PROPOSAL PDF
router.post(
  "/:id/generate-pdf",
  authMiddleware,
  controller.generateProposalPdf
);


export default router;