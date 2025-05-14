import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
const router = Router();

// @route   POST /api/v1/users/register
// @desc    Register a new user

router.post("/register", registerUser);

export default router;
