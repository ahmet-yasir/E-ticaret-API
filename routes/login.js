import { Router } from "express";
import { registerWithEmail, registerWithGoogle, loginWithGoogle, loginWithPassword} from "../controllers/login.js";

export const router = Router();

router.post("/login-google", loginWithGoogle);
router.post("/register", registerWithEmail);
router.post("/register-google", registerWithGoogle);
router.post("/login", loginWithPassword);
