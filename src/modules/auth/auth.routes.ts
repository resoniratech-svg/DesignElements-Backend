import { Router } from "express";
import { login, registerAdmin } from "./auth.controller";

const router = Router();

router.post("/register", registerAdmin); // first admin
router.post("/login", login);

export default router;