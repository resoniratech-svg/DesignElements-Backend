import { Router } from "express";
import * as creditRequestController from "./creditRequest.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = Router();

router.post("/", authMiddleware, creditRequestController.createCreditRequest);
router.get("/", authMiddleware, creditRequestController.getAllCreditRequests);
router.get("/:id", authMiddleware, creditRequestController.getCreditRequestById);
router.put("/:id", authMiddleware, creditRequestController.updateCreditRequest);
router.delete("/:id", authMiddleware, creditRequestController.deleteCreditRequest);

export default router;
