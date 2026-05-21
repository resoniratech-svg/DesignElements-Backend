import { Router } from "express";
import { createClient, getClients, getClientById } from "./client.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { updateClient } from "./client.controller";
import { deleteClient } from "./client.controller";

import { softDeleteClient } from "./client.controller";
import { addLicense } from "./client.controller";
import { addAgreement } from "./client.controller";
import { getAgreements } from "./client.controller";




const router = Router();

router.post("/", createClient);
router.get("/", authMiddleware, getClients);
router.get("/:id", authMiddleware, getClientById);
router.put("/:id", authMiddleware, updateClient);
router.delete("/:id", authMiddleware, deleteClient);
router.patch("/:id/soft-delete", authMiddleware, softDeleteClient);
router.post("/:id/licenses", authMiddleware, addLicense);

router.post("/:id/agreements", authMiddleware, addAgreement);


router.get("/:id/agreements", authMiddleware, getAgreements);
export default router;