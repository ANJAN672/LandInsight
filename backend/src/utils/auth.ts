import jwt from "jsonwebtoken";
import type { UserPayload } from "../types";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

export function signToken(payload: UserPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
  } catch {
    return null;
  }
}
