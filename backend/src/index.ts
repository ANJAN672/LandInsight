import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth";
import analysisRoutes from "./routes/analysis";
import conversationRoutes from "./routes/conversation";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/conversations", conversationRoutes);

app.listen(port, () => {
  console.log(`LandInsight backend listening on port ${port}`);
});
