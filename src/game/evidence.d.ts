export type Evidence = { version: number; dropped: number; events: Record<string, unknown>[] };
export function restoreEvidence(raw?: unknown): Evidence;
export function recordEvidence(log: Evidence, context: Record<string, unknown>, type: string, details?: Record<string, unknown>): void;
export function evidenceContext(question: unknown, year: string | number, difficulty: number, topic: string | number, activeMs?: number, contentVersion?: string): Record<string, unknown>;
export function startEvidenceClock(current: () => { activeMs?: number } | null, save: () => void): () => void;
