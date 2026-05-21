import { Router } from "express";
import { 
  getEmployees, 
  getEmployee, 
  createEmployee, 
  updateEmployee, 
  deleteEmployee, 
  getDashboardStats 
} from "./employees.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = Router();

// Apply auth middleware to all employee routes
router.use(authMiddleware);

router.get("/", getEmployees);
router.get("/dashboard-stats", getDashboardStats);
router.get("/:id", getEmployee);
router.post("/", createEmployee);
router.put("/:id", updateEmployee);
router.delete("/:id", deleteEmployee);

export default router;
