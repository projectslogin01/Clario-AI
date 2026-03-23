import { Router } from "express";
import { register ,login ,getme} from "../controllers/auth.controller.js";
import { registerValidator ,loginValidator} from "../validators/auth.validator.js";
import { verifyEmail } from "../controllers/auth.controller.js";
import { authUser } from "../middleware/auth.middleware.js";

const authRouter = Router();

// Public registration route. Validation runs before the controller.
/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 * @body { username, email, password }
 */
authRouter.post("/register", registerValidator, register);

// Public login route. Backend returns a cookie on success.
/**
 * @route POST /api/auth/login
 * @desc Login a user and return JWT
 * @access Public
 * @body { email, password }
 */
authRouter.post("/login", loginValidator, login);

// Email verification comes from the link inside the welcome email.
authRouter.get("/verify-email",verifyEmail);

/**
 * @route GET /api/auth/get-me
 * @desc Return the current authenticated user
 * @access Private
 */
authRouter.get("/get-me", authUser, getme)

export default authRouter;
