import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import userModel from "../models/user.model.js";
import { sendEmail } from "../services/mail.service.js";

const SERVER_URL = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_STATE_COOKIE = "google_oauth_state";
const GOOGLE_SCREEN_COOKIE = "google_oauth_screen";
const EMAIL_TIMEOUT_MS = 12000;
const isProduction = process.env.NODE_ENV === "production";
const AUTH_COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000
};
const GOOGLE_COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    path: "/api/auth/google",
    maxAge: 10 * 60 * 1000
};
const GOOGLE_CLEAR_COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    path: "/api/auth/google"
};

function createToken(payload, expiresIn) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

function getRequestBaseUrl(req) {
    const protocol = req.get("x-forwarded-proto") || req.protocol || "http";
    const host = req.get("x-forwarded-host") || req.get("host") || `localhost:${process.env.PORT || 5000}`;

    return `${protocol}://${host}`;
}

function getGoogleRedirectUri(req) {
    return process.env.GOOGLE_REDIRECT_URI || `${getRequestBaseUrl(req)}/api/auth/google/callback`;
}

function createGoogleClient(req) {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return null;
    }

    return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, getGoogleRedirectUri(req));
}

function sendError(res, status, message, err = null) {
    return res.status(status).json({
        success: false,
        message,
        ...(err ? { err } : {})
    });
}

function formatUser(user) {
    return {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || ""
    };
}

function setAuthCookie(res, user) {
    const token = createToken(
        {
            id: user._id,
            username: user.username
        },
        "7d"
    );

    res.cookie("token", token, AUTH_COOKIE_OPTIONS);
}

function toAvatarDataUrl(file) {
    if (!file?.buffer?.length) {
        return "";
    }

    const mimeType = String(file.mimetype || "application/octet-stream");
    const base64 = Buffer.from(file.buffer).toString("base64");
    return `data:${mimeType};base64,${base64}`;
}

function getVerificationUrl(token) {
    return `${SERVER_URL}/api/auth/verify-email?token=${token}`;
}

function buildVerificationData(email) {
    const token = createToken({ email }, "1d");

    return {
        token,
        url: getVerificationUrl(token)
    };
}

function buildClientUrl(pathname = "/", searchParams = {}) {
    const url = new URL(CLIENT_URL);
    url.pathname = pathname;
    url.search = "";

    Object.entries(searchParams).forEach(([ key, value ]) => {
        if (value) {
            url.searchParams.set(key, value);
        }
    });

    return url.toString();
}

function normalizeGoogleScreen(screen) {
    return screen === "register" ? "register" : "login";
}

function clearGoogleAuthCookies(res) {
    res.clearCookie(GOOGLE_STATE_COOKIE, GOOGLE_CLEAR_COOKIE_OPTIONS);
    res.clearCookie(GOOGLE_SCREEN_COOKIE, GOOGLE_CLEAR_COOKIE_OPTIONS);
}

function getGoogleErrorRedirect(screen, message) {
    return buildClientUrl(`/${normalizeGoogleScreen(screen)}`, {
        googleError: message
    });
}

function buildVerificationEmailHtml({ username, verificationUrl }) {
    return `
        <div style="margin:0;padding:32px 16px;background:#f4efe6;font-family:Arial,sans-serif;color:#1d2433;">
            <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e3dccf;border-radius:28px;overflow:hidden;box-shadow:0 24px 60px rgba(29,36,51,0.12);">
                <div style="padding:32px;background:linear-gradient(135deg,#edf6e8 0%,#f6f1e8 100%);border-bottom:1px solid #ebe3d6;">
                    <div style="display:inline-flex;align-items:center;gap:12px;">
                        <div style="width:48px;height:48px;border-radius:16px;background:#8ea572;color:#ffffff;display:grid;place-items:center;font-size:20px;font-weight:700;">C</div>
                        <div>
                            <p style="margin:0;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#6b768d;">Clario AI</p>
                            <h1 style="margin:8px 0 0;font-size:30px;line-height:1.1;letter-spacing:-0.04em;">Verify your email</h1>
                        </div>
                    </div>
                </div>

                <div style="padding:32px;">
                    <p style="margin:0 0 16px;font-size:17px;line-height:1.7;">Hi ${username},</p>
                    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;color:#4f5b73;">
                        Your Clario AI account is almost ready. Please confirm your email address so we know it is really you.
                    </p>

                    <div style="margin:28px 0;">
                        <a href="${verificationUrl}" style="display:inline-block;padding:15px 26px;border-radius:999px;background:#8ea572;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;box-shadow:0 16px 30px rgba(142,165,114,0.28);">
                            Verify email
                        </a>
                    </div>

                    <div style="padding:18px;border:1px solid #ebe3d6;border-radius:20px;background:#fbf8f2;">
                        <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#364156;">Button not working?</p>
                        <p style="margin:0;font-size:14px;line-height:1.8;color:#5f6b82;word-break:break-word;">
                            Copy and open this link:<br />
                            <a href="${verificationUrl}" style="color:#6e8754;text-decoration:none;">${verificationUrl}</a>
                        </p>
                    </div>
                </div>

                <div style="padding:20px 32px;border-top:1px solid #ebe3d6;background:#faf7f1;">
                    <p style="margin:0;font-size:13px;line-height:1.7;color:#6b768d;">
                        This verification link will expire in 24 hours. If you did not create this account, you can safely ignore this email.
                    </p>
                </div>
            </div>
        </div>
    `;
}

function buildVerificationEmailText({ username, verificationUrl }) {
    return [
        `Hi ${username},`,
        "",
        "Welcome to Clario AI.",
        "Please verify your email address by opening the link below:",
        verificationUrl,
        "",
        "This link will expire in 24 hours."
    ].join("\n");
}

function buildVerificationSuccessHtml() {
    const loginUrl = buildClientUrl("/login");

    return `
        <div style="margin:0;min-height:100vh;padding:32px 16px;background:linear-gradient(180deg,#f3efe6 0%,#f8f5ee 100%);font-family:Arial,sans-serif;color:#1d2433;">
            <div style="max-width:640px;margin:72px auto;background:#ffffff;border:1px solid #e6dece;border-radius:30px;padding:40px;box-shadow:0 24px 56px rgba(29,36,51,0.12);text-align:center;">
                <div style="width:72px;height:72px;margin:0 auto 20px;border-radius:22px;background:#8ea572;color:#ffffff;display:grid;place-items:center;font-size:32px;font-weight:700;">C</div>
                <p style="margin:0 0 10px;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#7b8598;">Clario AI</p>
                <h1 style="margin:0 0 16px;font-size:40px;line-height:1.05;letter-spacing:-0.05em;">Email verified</h1>
                <p style="margin:0 auto 28px;max-width:32rem;font-size:17px;line-height:1.8;color:#556178;">
                    Your account is now verified and ready to use. You can head back to Clario AI and sign in.
                </p>
                <a href="${loginUrl}" style="display:inline-block;padding:15px 26px;border-radius:999px;background:#8ea572;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;box-shadow:0 16px 30px rgba(142,165,114,0.28);">
                    Go to login
                </a>
            </div>
        </div>
    `;
}

function normalizeUsernameSeed(value) {
    const cleaned = String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 24);

    return cleaned || "clario_user";
}

async function createUniqueUsername(seed) {
    const base = normalizeUsernameSeed(seed);
    let username = base;
    let count = 1;

    while (await userModel.exists({ username })) {
        count += 1;
        const suffix = `_${count}`;
        username = `${base.slice(0, Math.max(3, 30 - suffix.length))}${suffix}`;
    }

    return username;
}

async function findOrCreateGoogleUser(profile) {
    const email = String(profile.email || "").trim().toLowerCase();

    if (!email) {
        throw new Error("Google account email is missing.");
    }

    let user = await userModel.findOne({ email });

    if (!user) {
        const username = await createUniqueUsername(profile.name || email.split("@")[0]);
        const password = randomBytes(24).toString("hex");

        user = await userModel.create({
            username,
            email,
            password,
            verified: true,
            avatar: profile.picture || ""
        });

        return user;
    }

    let userChanged = false;

    if (!user.verified) {
        user.verified = true;
        userChanged = true;
    }

    if (!user.avatar && profile.picture) {
        user.avatar = profile.picture;
        userChanged = true;
    }

    if (userChanged) {
        await user.save();
    }

    return user;
}

async function sendWelcomeEmail(user, verificationUrl) {
    await sendEmail({
        to: user.email,
        subject: "Verify your Clario AI account",
        text: buildVerificationEmailText({
            username: user.username,
            verificationUrl
        }),
        html: buildVerificationEmailHtml({
            username: user.username,
            verificationUrl
        })
    });
}

function timeoutResult(ms) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                emailSent: false,
                timedOut: true,
                error: new Error("Verification email is taking too long to send.")
            });
        }, ms);
    });
}

async function trySendWelcomeEmail(user, verificationUrl) {
    const emailTask = sendWelcomeEmail(user, verificationUrl)
        .then(() => ({
            emailSent: true,
            timedOut: false,
            error: null
        }))
        .catch((error) => ({
            emailSent: false,
            timedOut: false,
            error
        }));

    const result = await Promise.race([
        emailTask,
        timeoutResult(EMAIL_TIMEOUT_MS)
    ]);

    if (!result.emailSent && result.error) {
        console.error("Welcome email could not be sent:", result.error?.message || result.error);
        console.log(`Verification URL for ${user.email}: ${verificationUrl}`);
    }

    return result;
}

export async function register(req, res) {
    try {
        const { username, email, password } = req.body;
        const existingUser = await userModel.findOne({
            $or: [ { email }, { username } ]
        });

        if (existingUser) {
            return sendError(res, 400, "User with this email or username already exists");
        }

        const user = await userModel.create({ username, email, password });
        const verification = buildVerificationData(user.email);
        const emailResult = await trySendWelcomeEmail(user, verification.url);

        return res.status(201).json({
            success: true,
            message: emailResult.emailSent
                ? "User registered successfully"
                : "User registered successfully, but the verification email is delayed. You can resend it from the login page.",
            user: formatUser(user),
            emailSent: emailResult.emailSent,
            verificationUrl: !isProduction ? verification.url : undefined
        });
    } catch (error) {
        console.error("Register error:", error);
        return sendError(res, 500, "Internal server error");
    }
}

export async function resendVerification(req, res) {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const genericMessage = "If an unverified account exists for this email, a verification link has been sent.";

        if (!email) {
            return sendError(res, 400, "Email is required.");
        }

        const user = await userModel.findOne({ email });

        if (!user || user.verified) {
            return res.status(200).json({
                success: true,
                message: genericMessage,
                emailSent: true
            });
        }

        const verification = buildVerificationData(user.email);
        const emailResult = await trySendWelcomeEmail(user, verification.url);

        return res.status(200).json({
            success: true,
            message: emailResult.emailSent
                ? genericMessage
                : "We could not send the verification email right now. Please try again in a moment.",
            emailSent: emailResult.emailSent,
            verificationUrl: !isProduction ? verification.url : undefined
        });
    } catch (error) {
        console.error("Resend verification error:", error);
        return sendError(res, 500, "Internal server error");
    }
}

export async function verifyEmail(req, res) {
    try {
        const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
        const user = await userModel.findOne({ email: decoded.email });

        if (!user) {
            return sendError(res, 400, "Invalid token", "User not found");
        }

        user.verified = true;
        await user.save();

        return res.status(200).send(buildVerificationSuccessHtml());
    } catch (error) {
        return sendError(res, 400, "Invalid or expired token", error.message);
    }
}

export async function login(req, res) {
    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email });

        if (!user) {
            return sendError(res, 400, "Invalid email or password", "User not found");
        }

        const passwordMatches = await user.comparePassword(password);

        if (!passwordMatches) {
            return sendError(res, 400, "Invalid email or password", "Incorrect password");
        }

        if (!user.verified) {
            return sendError(res, 400, "Please verify your email before logging in", "Email not verified");
        }

        setAuthCookie(res, user);

        return res.status(200).json({
            success: true,
            message: "Login successful",
            user: formatUser(user)
        });
    } catch (error) {
        console.error("Login error:", error);
        return sendError(res, 500, "Internal server error");
    }
}

export async function googleAuthStart(req, res) {
    const screen = normalizeGoogleScreen(req.query.screen);
    const googleClient = createGoogleClient(req);

    if (!googleClient) {
        return res.redirect(getGoogleErrorRedirect(screen, "Google sign in is not configured yet."));
    }

    const state = randomBytes(24).toString("hex");
    res.cookie(GOOGLE_STATE_COOKIE, state, GOOGLE_COOKIE_OPTIONS);
    res.cookie(GOOGLE_SCREEN_COOKIE, screen, GOOGLE_COOKIE_OPTIONS);

    const authUrl = googleClient.generateAuthUrl({
        scope: [ "openid", "email", "profile" ],
        prompt: "select_account",
        state
    });

    return res.redirect(authUrl);
}

export async function googleAuthCallback(req, res) {
    const screen = normalizeGoogleScreen(req.cookies?.[GOOGLE_SCREEN_COOKIE]);
    const googleClient = createGoogleClient(req);
    const redirectWithError = (message) => {
        clearGoogleAuthCookies(res);
        return res.redirect(getGoogleErrorRedirect(screen, message));
    };

    if (!googleClient) {
        return redirectWithError("Google sign in is not configured yet.");
    }

    if (req.query.error) {
        return redirectWithError("Google sign in was cancelled.");
    }

    const savedState = String(req.cookies?.[GOOGLE_STATE_COOKIE] || "");
    const returnedState = String(req.query.state || "");
    const code = String(req.query.code || "");

    clearGoogleAuthCookies(res);

    if (!savedState || !returnedState || savedState !== returnedState) {
        return res.redirect(getGoogleErrorRedirect(screen, "Google sign in could not be verified."));
    }

    if (!code) {
        return res.redirect(getGoogleErrorRedirect(screen, "Google did not return a login code."));
    }

    try {
        const { tokens } = await googleClient.getToken(code);
        const idToken = tokens?.id_token;

        if (!idToken) {
            return res.redirect(getGoogleErrorRedirect(screen, "Google did not return a valid identity token."));
        }

        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();

        if (!payload?.email || !payload?.email_verified) {
            return res.redirect(getGoogleErrorRedirect(screen, "Google account email is not verified."));
        }

        const user = await findOrCreateGoogleUser({
            email: payload.email,
            name: payload.name || payload.given_name || payload.email.split("@")[0],
            picture: payload.picture || ""
        });

        setAuthCookie(res, user);

        return res.redirect(buildClientUrl("/", { google: "1" }));
    } catch (error) {
        console.error("Google auth error:", error);
        return res.redirect(getGoogleErrorRedirect(screen, "Google sign in failed. Please try again."));
    }
}

export async function getme(req, res) {
    try {
        const user = await userModel.findById(req.user.id).select("-password");

        if (!user) {
            return sendError(res, 404, "User not found", "User not found");
        }

        return res.status(200).json({
            success: true,
            message: "User details fetched successfully",
            user
        });
    } catch (error) {
        console.error("Get me error:", error);
        return sendError(res, 500, "Internal server error");
    }
}

export async function updateProfile(req, res) {
    try {
        const user = await userModel.findById(req.user.id);

        if (!user) {
            return sendError(res, 404, "User not found", "User not found");
        }

        const nextUsername = String(req.body.username || "").trim();

        if (!nextUsername) {
            return sendError(res, 400, "Username is required.");
        }

        const existingUser = await userModel.findOne({
            username: nextUsername,
            _id: { $ne: user._id }
        });

        if (existingUser) {
            return sendError(res, 400, "That username is already in use.");
        }

        user.username = nextUsername;

        if (req.file) {
            user.avatar = toAvatarDataUrl(req.file);
        }

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: formatUser(user)
        });
    } catch (error) {
        console.error("Update profile error:", error);
        return sendError(res, 500, "Internal server error");
    }
}

export function logout(req, res) {
    res.clearCookie("token", {
        httpOnly: true,
        sameSite: isProduction ? "none" : "lax",
        secure: isProduction,
        path: "/"
    });

    return res.status(200).json({
        success: true,
        message: "Logout successful"
    });
}
