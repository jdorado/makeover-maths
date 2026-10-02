import { verifyToken } from "@clerk/backend";
import { savesCollection } from "../server/database.js";
import { MAX_BYTES, readAccount, writeAccount } from "../server/save-service.js";

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "private, no-store");
  response.setHeader("Vary", "Authorization");
  if (!["GET", "PUT"].includes(request.method)) {
    response.setHeader("Allow", "GET, PUT");
    return response.status(405).json({ error: "Method not allowed." });
  }
  const authorizedParties = (process.env.APP_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean);
  if (!process.env.CLERK_SECRET_KEY || !process.env.MONGODB_URI || !process.env.MONGODB_DATABASE || !authorizedParties.length) {
    return response.status(503).json({ error: "Online saves are not configured. The device save is safe." });
  }
  let userId;
  try {
    const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new Error("Missing token");
    const claims = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY, authorizedParties });
    if (!claims.sub || !claims.sid || !authorizedParties.includes(claims.azp)) throw new Error("Invalid session");
    userId = claims.sub;
  } catch {
    return response.status(401).json({ error: "Sign in again to save online." });
  }
  try {
    if (Number(request.headers["content-length"]) > MAX_BYTES) return response.status(413).json({ error: "This save is too large." });
    const collection = await savesCollection();
    if (request.method === "GET") return response.status(200).json(await readAccount(collection, userId));
    const input = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
    const result = await writeAccount(collection, userId, input);
    return response.status(result.status).json(result.body);
  } catch {
    return response.status(503).json({ error: "Online saving is unavailable. The device save is safe." });
  }
}

