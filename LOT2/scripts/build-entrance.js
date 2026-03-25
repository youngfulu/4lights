#!/usr/bin/env node
/**
 * LOT2: Build entrance start-screen frames manifest from ../Entrance GIF.
 * Writes: LOT2/public/data/entrance.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
 
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOT2_ROOT = path.resolve(__dirname, '..');
const ENTRANCE_SOURCE = path.resolve(LOT2_ROOT, '..', 'Entrance GIF');
const DEST = path.resolve(LOT2_ROOT, 'public', 'data', 'entrance.json');
const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
 
function main() {
  if (!fs.existsSync(ENTRANCE_SOURCE)) {
    console.warn('LOT2: Entrance GIF folder not found:', ENTRANCE_SOURCE);
    fs.mkdirSync(path.dirname(DEST), { recursive: true });
    fs.writeFileSync(DEST, JSON.stringify({ frames: [] }, null, 2), 'utf8');
    return;
  }
 
  const frames = fs
    .readdirSync(ENTRANCE_SOURCE, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => ALLOWED.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
 
  fs.mkdirSync(path.dirname(DEST), { recursive: true });
  fs.writeFileSync(DEST, JSON.stringify({ frames }, null, 2), 'utf8');
  console.log('LOT2: entrance source =', ENTRANCE_SOURCE);
  console.log('LOT2: wrote', frames.length, 'frames to', DEST);
}
 
main();

