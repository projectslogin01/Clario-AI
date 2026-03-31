import nodemailer from "nodemailer";
import { OAuth2Client } from "google-auth-library";

const gmailUser = process.env.GOOGLE_USER;
const gmailAppPassword = process.env.GOOGLE_APP_PASSWORD;
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleRefreshToken = process.env.GOOGLE_REFRESH_TOKEN;

function hasAppPasswordConfig() {
    return Boolean(gmailUser && gmailAppPassword);
}

function hasOAuthConfig() {
    return Boolean(
        gmailUser &&
        googleClientId &&
        googleClientSecret &&
        googleRefreshToken
    );
}

function createAppPasswordTransporter() {
    return nodemailer.createTransport({
        service: "gmail",
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        auth: {
            user: gmailUser,
            pass: gmailAppPassword
        }
    });
}

async function createOAuthTransporter() {
    let accessToken = null;

    try {
        const oauth2Client = new OAuth2Client(googleClientId, googleClientSecret);
        oauth2Client.setCredentials({ refresh_token: googleRefreshToken });

        const tokenResponse = await oauth2Client.getAccessToken();
        accessToken = typeof tokenResponse === "string" ? tokenResponse : tokenResponse?.token;
    } catch (error) {
        throw new Error(
            `Gmail OAuth setup failed. Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN. ${error?.message || ""}`.trim()
        );
    }

    if (!accessToken) {
        throw new Error("Could not create a Gmail access token.");
    }

    return nodemailer.createTransport({
        service: "gmail",
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        auth: {
            type: "OAuth2",
            user: gmailUser,
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            refreshToken: googleRefreshToken,
            accessToken
        }
    });
}

async function createTransporter() {
    if (hasAppPasswordConfig()) {
        return createAppPasswordTransporter();
    }

    if (hasOAuthConfig()) {
        return createOAuthTransporter();
    }

    throw new Error(
        "Email is not configured. Use GOOGLE_APP_PASSWORD, or set GOOGLE_USER, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN."
    );
}

export async function sendEmail({ to, subject, html, text }) {
    const transporter = await createTransporter();

    return transporter.sendMail({
        from: gmailUser,
        to,
        subject,
        html,
        text
    });
}
