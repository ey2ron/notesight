import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import multer from 'multer';
import mime from 'mime-types';
import { config } from './config.js';
import {
  addEvent,
  createScore,
  deleteScore,
  findScore,
  listEvents,
  listScores,
  updateScore,
} from './db.js';
import { processScore } from './jobs/processScore.js';
import {
  ensureScoreDir,
  relativeScorePath,
  removeScoreDir,
} from './storage.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const incomingDir = path.join(config.storageDir, '_incoming');
await fs.mkdir(incomingDir, { recursive: true });

const upload = multer({
  dest: incomingDir,
  limits: { fileSize: config.maxUploadSize },
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/scores', (_req, res) => {
  res.json(listScores());
});

app.get('/api/scores/:id', (req, res) => {
  const score = findScore(req.params.id);
  if (!score) {
    return res.status(404).json({ message: 'Score not found' });
  }
  res.json(score);
});

app.get('/api/scores/:id/progress', (req, res) => {
  const score = findScore(req.params.id);
  if (!score) {
    return res.status(404).json({ message: 'Score not found' });
  }
  res.json({ progress: score.progress, status: score.status, error: score.error });
});

app.get('/api/scores/:id/events', (req, res) => {
  const score = findScore(req.params.id);
  if (!score) {
    return res.status(404).json({ message: 'Score not found' });
  }
  res.json(listEvents(score.id));
});

app.post('/api/scores', upload.single('file'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'A name is required.' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'An image file is required.' });
    }

    const timestamp = Date.now();
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    const originalExtension =
      mime.extension(req.file.mimetype) || path.extname(req.file.originalname) || 'png';
    const extension = String(originalExtension).replace(/^\./, '') || 'png';

    const scoreId = createScore({ name: name.trim(), imagePath: 'pending' });
    await ensureScoreDir(scoreId);

    const baseName = `${timestamp}-${slug || 'score'}`;
    const destFileName = `${baseName}.${extension}`;
    const relativeImagePath = relativeScorePath(scoreId, destFileName);
    const absoluteImagePath = path.join(config.storageDir, relativeImagePath);

    await fs.rename(req.file.path, absoluteImagePath);

    updateScore(scoreId, { image_path: relativeImagePath, status: 'queued', progress: 1 });
    addEvent(scoreId, 'status', { message: 'Upload received' });

    processScore(scoreId).catch((jobError) => {
      console.error('Failed to process score', jobError);
    });

    const score = findScore(scoreId);
    res.status(201).json(score);
  } catch (error) {
    if (req.file) {
      await fs.rm(req.file.path, { force: true });
    }
    res.status(500).json({ message: 'Failed to upload score', detail: error.message });
  }
});

app.delete('/api/scores/:id', async (req, res) => {
  const score = findScore(req.params.id);
  if (!score) {
    return res.status(404).json({ message: 'Score not found' });
  }
  deleteScore(score.id);
  await removeScoreDir(score.id);
  res.status(204).send();
});

app.use('/files', express.static(config.storageDir));

if (config.spaRoot) {
  app.use(express.static(config.spaRoot));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(config.spaRoot, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  const message = err instanceof Error ? err.message : 'Unexpected error';
  res.status(500).json({ message });
});

app.listen(config.port, config.host, () => {
  console.log(`ReMusic server listening on http://${config.host}:${config.port}`);
});
