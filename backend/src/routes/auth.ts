import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { signToken, verifyToken } from "../utils/auth";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body as { email?: string; password?: string; name?: string };
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split("@")[0],
      },
    });

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7 * 1000,
      path: "/",
    });

    return res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7 * 1000,
      path: "/",
    });

    return res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Login failed" });
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("auth_token", { path: "/" });
  return res.json({ success: true });
});

router.get("/me", async (req, res) => {
  const token = req.cookies?.auth_token || req.header("authorization")?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ user: null });
  }
  const session = verifyToken(token);
  if (!session) {
    return res.status(401).json({ user: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) {
    return res.status(401).json({ user: null });
  }

  return res.json({ user });
});

export default router;
