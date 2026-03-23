import userModel from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "../services/mail.service.js";

/**
 * Registers a user, creates an email verification token, and sends the verification email.
 * The account is created even if email delivery fails, so the frontend should still tell the
 * user to check email and contact support if no message arrives.
 */
export async function register(req, res) {
    try {
        const { username, email, password } = req.body;

        // 1. Check if user already exists
        const isUserAlreadyExists = await userModel.findOne({
            $or: [{ email }, { username }]
        });

        if (isUserAlreadyExists) {
            return res.status(400).json({
                message: "User with this email or username already exists",
                success: false
            });
        }

        // 2. Create user first
        const user = await userModel.create({ username, email, password });

        // 3. Generate token (AFTER user exists OR directly use email)
        const emailVerificationToken = jwt.sign(
            { email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        // 4. Send email
        try {
            await sendEmail({
                to: email,
                subject: "Welcome to Clario-AI!",
                html: `
                    <p>Hi ${username},</p>
                    <p>Thank you for registering at <strong>Clario</strong>. We're excited to have you on board!</p>
                    <p>Please verify your email address by clicking the link below:</p>
                    <a href="http://localhost:5000/api/auth/verify-email?token=${emailVerificationToken}">
                        Verify Email
                    </a>
                    <p>If you didn't create an account, please ignore this email.</p>
                    <p>Best regards,<br>The Clario Team</p>
                `
            });
        } catch (error) {
            console.error("Welcome email could not be sent:", error?.message || error);
        }

        // 5. Response
        return res.status(201).json({
            message: "User registered successfully",
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Register error:", error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
}

/**
 * Verifies the email token from the mail link and marks the user as verified.
 */
export async function verifyEmail(req,res){
    const { token } = req.query;

    try{
        const decoded = jwt.verify(token,process.env.JWT_SECRET);

    
    const user = await userModel.findOne({email: decoded.email });

    if(!user){
        return res.status(400).json({
            message: "Invalid token",
            success: false,
            err: "User not found"
        })
    }

    user.verified = true;
    await user.save();

    return res.send(`
    <h1>Email Verified Successfully</h1>
    <p>Your email has been verified. You can now log in to your account.</p>
    <a href="http://localhost:3000/login">Go to Login</a>
`);
}catch(err){
        return res.status(400).json({
            message: "Invalid or expired token",
            success: false,
            err: err.message
        })
    }
}

/**
 * Logs the user in after checking password and email verification state.
 * On success the JWT is stored in an HTTP cookie.
 */
export async function login(req,res){
    const { email, password } = req.body;

    const user = await userModel.findOne({ email })

    if(!user){
        return res.status(400).json({
            message: "Invalid email or password",
            success: false,
            err: "User not found"
        })
    }

    const isPasswordMatch = await user.comparePassword(password);

    if(!isPasswordMatch){
        return res.status(400).json({
            message: "Invalid email or password",
            success: false,
            err: "Incorrect password"
        })
    }

    if(!user.verified){
        return res.status(400).json({
            message: "Please verify your email before logging in",
            success: false,
            err: "Email not verified"
        })
    }

    const token = jwt.sign({
        id: user._id,
        username: user.username,
    }, process.env.JWT_SECRET, {expiresIn: '7d'})

    res.cookie("token", token)
    res.status(200).json({
        message: "Login successful",
        success: true,
        user: {
            id: user._id,
            userrname: user.username,
            email: user.email
        }
    })
}

/**
 * Returns the currently authenticated user based on the cookie-decoded JWT payload.
 */
export async function getme(req,res) {
    const userId = req.user.id;
    const user = await userModel.findById(userId).select("-password");

    if(!user){
        return res.status(404).json({
            message: "User not found",
            success: false,
            err: "User not found"
        })
    }

    res.status(200).json({
        message: "User details fetched successfully",
        success: true,
        user
    })
}
