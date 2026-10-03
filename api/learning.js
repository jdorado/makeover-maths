import { crossGameContext, linkLearner } from '../server/cross-game-learning.js';
import { verifyToken } from "@clerk/backend";
import { savesCollection, learningCollection, learnersCollection } from "../server/database.js";

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
    if (request.method === 'PUT') {
      if (Number(request.headers['content-length']) > 4096) return response.status(413).json({ error: 'Request too large.' });
      const input = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
      if (JSON.stringify(input || {}).length > 4096) return response.status(413).json({ error: 'Request too large.' });
      const result = await linkLearner(await savesCollection(), await learnersCollection(), userId, input);
      return response.status(result.status).json(result.body);
    }
    const cursor = new URL(request.url, 'https://game.invalid').searchParams.get('cursor') || '';
    if (cursor && !/^[a-f0-9]{64}$/.test(cursor)) return response.status(400).json({ error: 'Invalid cursor.' });
    return response.status(200).json(await crossGameContext(await savesCollection(), await learningCollection(), await learnersCollection(), userId, cursor));
  } catch {
    return response.status(503).json({ error: "Online saving is unavailable. The device save is safe." });
  }
}
