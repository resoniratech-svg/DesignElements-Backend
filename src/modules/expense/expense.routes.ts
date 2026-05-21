import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { getDivisionExpenseReport } from "./expense.controller";

import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  approveExpense,
  rejectExpense
} from "./expense.controller";
import { getCategoryExpenseReport } from "./expense.controller";
const router = Router();
router.get(
  "/reports/division-expenses",
  authMiddleware,
  getDivisionExpenseReport
);
router.post("/", authMiddleware, createExpense);
router.get("/", authMiddleware, getExpenses);


router.get(
  "/reports/category-expenses",
  authMiddleware,
  getCategoryExpenseReport
);
router.get("/:expenseId", authMiddleware, getExpenseById);
router.put("/:expenseId", authMiddleware, updateExpense);
router.delete("/:expenseId", authMiddleware, deleteExpense);
router.put("/:expenseId/approve", authMiddleware, approveExpense);
router.put("/:expenseId/reject", authMiddleware, rejectExpense);

export default router;