import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { addEvent, findScore, updateScore } from '../db.js';
import { ensureScoreDir, relativeScorePath, scoreStorageDir } from '../storage.js';

async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      ...options,
    });

    const logs = [];
    child.stdout.on('data', (chunk) => {
      logs.push(chunk.toString());
    });
    child.stderr.on('data', (chunk) => {
      logs.push(chunk.toString());
    });

    child.on('error', (error) => {
      reject(Object.assign(error, { logs: logs.join('') }));
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(logs.join(''));
      } else {
        reject(new Error(`Command ${command} exited with code ${code}.\n${logs.join('')}`));
      }
    });
  });
}

async function updateProgress(scoreId, progress, status) {
  updateScore(scoreId, { progress, status });
}

export async function processScore(scoreId) {
  const score = findScore(scoreId);
  if (!score) {
    return;
  }

  try {
    await ensureScoreDir(scoreId);
    const storageDir = scoreStorageDir(scoreId);
    const sourceImagePath = path.join(config.storageDir, score.image_path);
    const baseName = path.parse(sourceImagePath).name;

    const musicXmlRelPath = relativeScorePath(scoreId, `${baseName}.musicxml`);
    const midiRelPath = relativeScorePath(scoreId, `${baseName}.mid`);

    const musicXmlAbsPath = path.join(config.storageDir, musicXmlRelPath);
    const midiAbsPath = path.join(config.storageDir, midiRelPath);

    updateProgress(scoreId, 5, 'processing');
    addEvent(scoreId, 'status', { message: 'OCR started' });

    const oemerArgs = ['-o', storageDir, sourceImagePath];
    await runCommand(config.oemerBin, oemerArgs);

    updateProgress(scoreId, 60, 'processing');
    addEvent(scoreId, 'status', { message: 'MusicXML generated' });

    let generatedXmlPath = path.join(storageDir, `${baseName}.musicxml`);
    try {
      await fs.access(generatedXmlPath);
    } catch (error) {
      const candidates = await fs.readdir(storageDir);
      const fallback = candidates.find((file) => file.toLowerCase().endsWith('.musicxml') || file.toLowerCase().endsWith('.xml'));
      if (!fallback) {
        throw new Error(`Expected MusicXML at ${generatedXmlPath} but it was not created.`);
      }
      generatedXmlPath = path.join(storageDir, fallback);
    }

    if (generatedXmlPath !== musicXmlAbsPath) {
      await fs.rename(generatedXmlPath, musicXmlAbsPath);
    }

    updateProgress(scoreId, 75, 'processing');
    addEvent(scoreId, 'status', { message: 'Starting MIDI conversion' });

    await runCommand(config.pythonBin, [config.midiScript, musicXmlAbsPath, midiAbsPath]);

    updateProgress(scoreId, 95, 'processing');
    addEvent(scoreId, 'status', { message: 'Validating output' });

    await fs.access(midiAbsPath);

    updateScore(scoreId, {
      musicxml_path: musicXmlRelPath,
      midi_path: midiRelPath,
      status: 'ready',
      progress: 100,
      error: null,
    });

    addEvent(scoreId, 'status', { message: 'Digitization complete' });
  } catch (error) {
    updateScore(scoreId, {
      status: 'error',
      progress: 100,
      error: error.message,
    });
    addEvent(scoreId, 'error', { message: error.message });
  }
}
