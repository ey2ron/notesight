import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';

export function scoreStorageDir(scoreId) {
  return path.join(config.storageDir, `scores`, String(scoreId));
}

export function relativeScorePath(scoreId, ...segments) {
  const normalized = segments.map((segment) => segment.replace(/\\/g, '/'));
  return path.posix.join('scores', String(scoreId), ...normalized);
}

export async function ensureScoreDir(scoreId) {
  const dir = scoreStorageDir(scoreId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function removeScoreDir(scoreId) {
  const dir = scoreStorageDir(scoreId);
  await fs.rm(dir, { recursive: true, force: true });
}
