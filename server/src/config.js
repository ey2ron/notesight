import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const storageDir = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.join(projectRoot, 'storage');

if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(projectRoot, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const scriptsDir = path.join(projectRoot, 'scripts');

export const config = {
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? '0.0.0.0',
  storageDir,
  dataDir,
  scriptsDir,
  oemerBin: process.env.OEMER_BIN ?? 'oemer',
  pythonBin: process.env.PYTHON_BIN ?? 'python',
  midiScript: process.env.MIDI_SCRIPT
    ? path.resolve(process.env.MIDI_SCRIPT)
    : path.join(scriptsDir, 'convert_to_midi.py'),
  maxUploadSize: Number(process.env.MAX_UPLOAD_SIZE_MB ?? 12) * 1024 * 1024,
  spaRoot: process.env.SPA_ROOT ? path.resolve(process.env.SPA_ROOT) : null,
};
