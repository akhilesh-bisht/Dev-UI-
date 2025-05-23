import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

// @route   POST /api/v1/users/register
// @desc    Register a new user

router.post(
  "/register",
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

// @route   POST /api/v1/users/login
// @desc    Login  user

router.post("/login", loginUser);

// secure routes
// @route   POST /api/v1/users/logout
// @desc    Logout  user

router.post("/logout", verifyJWT, logoutUser);

export default router;
