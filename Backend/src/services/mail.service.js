import nodemailer from "nodemailer";
import { OAuth2Client } from "google-auth-library";

const gmailUser = process.env.GOOGLE_USER;
const gmailAppPassword = process.env.GOOGLE_APP_PASSWORD;
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleRefreshToken = process.env.GOOGLE_REFRESH_TOKEN;

// OAuth mode is preferred when the Gmail client credentials are available.
function hasOAuthConfig() {
    return Boolean(gmailUser && googleClientId && googleClientSecret && googleRefreshToken);
}

// App password mode is a simpler fallback for local development.
function createAppPasswordTransporter() {
    if (!gmailUser || !gmailAppPassword) {
        throw new Error("Missing Gmail app password configuration.");
    }

    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: gmailUser,
            pass: gmailAppPassword
        }
    });
}

// Builds a Gmail OAuth2 transporter using the refresh token from env.
async function createOAuthTransporter() {
    if (!hasOAuthConfig()) {
        throw new Error("Missing Gmail OAuth2 configuration.");
    }

    const oauth2Client = new OAuth2Client(googleClientId, googleClientSecret);
    oauth2Client.setCredentials({ refresh_token: googleRefreshToken });

    const accessTokenResponse = await oauth2Client.getAccessToken();
    const accessToken = typeof accessTokenResponse === "string"
        ? accessTokenResponse
        : accessTokenResponse?.token;

    if (!accessToken) {
        throw new Error("Google did not return an access token for the configured refresh token.");
    }

    return nodemailer.createTransport({
        service: "gmail",
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

// Pick the first email strategy that has complete configuration.
async function createTransporter() {
    if (gmailAppPassword) {
        return createAppPasswordTransporter();
    }

    if (hasOAuthConfig()) {
        return createOAuthTransporter();
    }

    throw new Error(
        "Email is not configured. Set GOOGLE_APP_PASSWORD, or provide GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, and GOOGLE_USER."
    );
}

// Keeps mail setup errors readable in local development logs.
function logMailError(context, error) {
    const message = error?.message || "";
    const unauthorizedClient = message.includes("unauthorized_client");

    if (unauthorizedClient) {
        console.error(
            `Email transporter ${context} failed: Gmail rejected the OAuth client for this refresh token. ` +
            "Regenerate the refresh token with the same GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, " +
            "or set GOOGLE_APP_PASSWORD to use a Gmail app password instead."
        );
        return;
    }

    console.error(`Email transporter ${context} failed:`, error);
}

// Verify mail configuration once on startup so configuration problems show up early.
void createTransporter()
    .then((transporter) => transporter.verify())
    .then(() => {
        console.log("Email transporter is ready to send emails");
    })
    .catch((error) => {
        logMailError("verification", error);
    });

/**
 * Sends an email using the configured Gmail transporter.
 * @param {{ to: string, subject: string, html?: string, text?: string }} payload
 */
export async function sendEmail({ to, subject, html, text }) {
    try {
        const transporter = await createTransporter();
        const details = await transporter.sendMail({
            from: gmailUser,
            to,
            subject,
            html,
            text
        });

        console.log("Email sent:", details);
        return details;
    } catch (error) {
        logMailError("send", error);
        throw error;
    }
}
