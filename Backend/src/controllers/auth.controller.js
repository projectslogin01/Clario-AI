import userModel from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "../services/mail.service.js";


export async function register(req, res) {

    const { username, email, password } = req.body;

    const isUserAlreadyExists = await userModel.findOne({
        $or: [ { email }, { username } ]
    })

    if (isUserAlreadyExists) {
        return res.status(400).json({
            message: "User with this email or username already exists",
            success: false,
            err: "User already exists"
        })
    }

    const user = await userModel.create({ username, email, password })

    try {
        await sendEmail({
            to: email,
            subject: "Welcome to Clario-AI!",
            html: `
                    <p>Hi ${username},</p>
                    <p>Thank you for registering at <strong>Clario</strong>. We're excited to have you on board!</p>
                    <p>Best regards,<br>The Clario Team</p>
            `
        });
    } catch (error) {
        console.error("Welcome email could not be sent:", error?.message || error);
    }

    res.status(201).json({
        message: "User registered successfully",
        success: true,
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    });



}
