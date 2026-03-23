import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes.js";

const app = express();
// These origins cover the common local dev ports used by Vite and other frontend setups.
const allowedOrigins = new Set(
    [
        process.env.FRONTEND_URL,
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174"
    ].filter(Boolean)
);

// Core middleware for CORS, JSON/form parsing, and cookie-based auth.
app.use(cors({
    // Allow the common local frontend URLs so auth works in dev without extra edits.
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get("/", (req, res) => {
    res.json({ message: "Server is running" });
});

app.use("/api/auth", authRouter);

export default app;
