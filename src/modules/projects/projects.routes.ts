import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { checkRole } from "../../middleware/role.middleware";

import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  updateProjectStatus,
  addProjectExpense,
  getProjectExpenses,
  getProjectProfit,
  deleteProject
} from "./projects.controller";

const router = Router();

/* Create Project */
router.post(
  "/",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER"]),
  createProject
);

/* Get All Projects */
router.get(
  "/",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER", "CLIENT"]),
  getProjects
);

/* Get Project By ID */
router.get(
  "/:id",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER", "CLIENT"]),
  getProjectById
);

/* Update Project (full edit) */
router.put(
  "/:id",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER"]),
  updateProject
);

/* Update Project Status */
router.patch(
  "/:id/status",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER"]),
  updateProjectStatus
);
router.post(
  "/:id/expense",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER"]),
  addProjectExpense
);
router.get(
  "/:id/expenses",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER"]),
  getProjectExpenses
);
router.get(
  "/:id/profit",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER"]),
  getProjectProfit
);

/* Delete Project */
router.delete(
  "/:id",
  authMiddleware,
  checkRole(["SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER"]),
  deleteProject
);

export default router;