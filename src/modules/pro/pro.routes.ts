import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { 
  getContracts, 
  getAllDocuments, 
  getTasks, 
  runExpiryCheck 
} from "./pro.controller";

const router = Router();

// Apply auth middleware to all PRO routes
router.use(authMiddleware);

router.get("/contracts/all", getContracts);
router.get("/documents/all", getAllDocuments);
router.get("/tasks", getTasks);
router.post("/expiry-check", runExpiryCheck);

export default router;
