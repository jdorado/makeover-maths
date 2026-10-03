import { createHash } from "node:crypto";
import { APP_CONFIG } from "../app.config.js";
import { restoreGameState } from "../src/game/save.ts";

export const MAX_BYTES = 1_000_000;
export const saveIdentity = (userId) => `${APP_CONFIG.id}:${userId}`;
export const publicSave = (document) => document
  ? { revision: document.revision, gameState: { schemaVersion: document.schemaVersion, gameId: document.gameId, contentVersion: document.contentVersion, selectedProfileId: document.selectedProfileId, profiles: document.profiles, view: document.view }, updatedAt: document.updatedAt }
  : { revision: 0, gameState: null, updatedAt: null };

export const normalizeGameState = restoreGameState;

export async function readAccount(collection, userId) { return publicSave(await collection.findOne({ _id: saveIdentity(userId) })); }

export async function writeAccount(collection, userId, input) {
  if (!Number.isSafeInteger(input?.revision) || input.revision < 0 || !/^[a-f0-9-]{36}$/.test(input?.mutationId || "")) {
    return { status: 400, body: { error: "Invalid save revision or operation ID." } };
  }
  let gameState;
  try { gameState = normalizeGameState(input.gameState); }
  catch (error) { return { status: 400, body: { error: error.message } }; }
  const _id = saveIdentity(userId);
  const digest = createHash("sha256").update(JSON.stringify(gameState)).digest("hex");
  const current = await collection.findOne({ _id });
  if (current?.mutationId === input.mutationId) {
    return current.digest === digest ? { status: 200, body: publicSave(current) } : { status: 409, body: { error: "Operation ID reuse.", ...publicSave(current) } };
  }
  if ((current?.revision || 0) !== input.revision || (current?.contentVersion || 0) > gameState.contentVersion) {
    return { status: 409, body: { error: "Another device has a newer save.", ...publicSave(current) } };
  }
  const next = { _id, parentId: userId, revision: input.revision + 1, ...gameState, mutationId: input.mutationId, digest, updatedAt: new Date().toISOString() };
  try {
    if (!current) await collection.insertOne(next);
    else {
      const { _id: ignored, ...fields } = next;
      void ignored;
      const result = await collection.updateOne({ _id, revision: input.revision }, { $set: fields });
      if (!result.matchedCount) return { status: 409, body: { error: "Another device has a newer save.", ...await readAccount(collection, userId) } };
    }
  } catch (error) {
    if (error.code !== 11000) throw error;
    const raced = await collection.findOne({ _id });
    if (raced.mutationId === input.mutationId && raced.digest === digest) return { status: 200, body: publicSave(raced) };
    return { status: 409, body: { error: "Another device has a newer save.", ...publicSave(raced) } };
  }
  return { status: 200, body: publicSave(next) };
}

