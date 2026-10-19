import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import secretRouter from "./routes/secret";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS for Next.js frontend
app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
    })
);

// Parse JSON request bodies
app.use(express.json());

// Basic health check endpoint
app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Mount secret endpoints
app.use("/api/secrets", secretRouter);

// Start server
app.listen(PORT, () => {
    console.log(`BurnEnv API listening on http://localhost:${PORT}`);
});
