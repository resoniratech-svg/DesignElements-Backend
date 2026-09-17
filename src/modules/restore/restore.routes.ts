import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import {
  getDeletedItems,
  restoreItem,
  permanentDeleteItem
} from "./restore.controller";

const router = Router();

router.use(authMiddleware);

router.get("/items", getDeletedItems);
router.post("/:type/:id", restoreItem);
router.delete("/:type/:id/permanent", permanentDeleteItem);

export default router;
