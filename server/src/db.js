import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from './config.js';

const dbPath = path.join(config.dataDir, 'scores.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    image_path TEXT NOT NULL,
    musicxml_path TEXT,
    midi_path TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    progress INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    score_id INTEGER NOT NULL,
    kind TEXT NOT NULL,
    payload TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(score_id) REFERENCES scores(id) ON DELETE CASCADE
  );
`);

const INSERT_SCORE = db.prepare(`
  INSERT INTO scores (name, image_path, status, progress, created_at, updated_at)
  VALUES (@name, @image_path, @status, @progress, @created_at, @updated_at)
`);

const UPDATE_SCORE = db.prepare(`
  UPDATE scores
  SET name = COALESCE(@name, name),
      image_path = COALESCE(@image_path, image_path),
      musicxml_path = COALESCE(@musicxml_path, musicxml_path),
      midi_path = COALESCE(@midi_path, midi_path),
      status = COALESCE(@status, status),
      progress = COALESCE(@progress, progress),
      error = COALESCE(@error, error),
      updated_at = @updated_at
  WHERE id = @id
`);

const DELETE_SCORE = db.prepare('DELETE FROM scores WHERE id = ?');
const SELECT_SCORES = db.prepare('SELECT * FROM scores ORDER BY created_at DESC');
const SELECT_SCORE = db.prepare('SELECT * FROM scores WHERE id = ?');
const INSERT_EVENT = db.prepare(`
  INSERT INTO events (score_id, kind, payload, created_at)
  VALUES (?, ?, ?, ?)
`);
const SELECT_EVENTS = db.prepare('SELECT * FROM events WHERE score_id = ? ORDER BY created_at ASC');

export function createScore({ name, imagePath }) {
  const timestamp = new Date().toISOString();
  const info = INSERT_SCORE.run({
    name,
    image_path: imagePath,
    status: 'pending',
    progress: 0,
    created_at: timestamp,
    updated_at: timestamp,
  });
  return info.lastInsertRowid;
}

export function updateScore(id, changes) {
  UPDATE_SCORE.run({
    id,
    ...changes,
    updated_at: new Date().toISOString(),
  });
}

export function deleteScore(id) {
  DELETE_SCORE.run(id);
}

export function listScores() {
  return SELECT_SCORES.all();
}

export function findScore(id) {
  return SELECT_SCORE.get(id);
}

export function addEvent(scoreId, kind, payload) {
  INSERT_EVENT.run(scoreId, kind, payload ? JSON.stringify(payload) : null, new Date().toISOString());
}

export function listEvents(scoreId) {
  return SELECT_EVENTS.all(scoreId).map((row) => ({
    ...row,
    payload: row.payload ? JSON.parse(row.payload) : null,
  }));
}
