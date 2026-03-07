#!/usr/bin/env node
/**
 * Merge two originals sources into 4lights-originals-restore/Imgae test.
 * When the same file exists in both, keep the one with higher quality (larger file size).
 * Sources:
 *   - SOURCE1: e.g. /Users/ilyaduganov/Desktop/4ligths content (or 4lights content)
 *   - SOURCE2: 4lights-originals-restore/Imgae test (current restored originals)
 * Output: 4lights-originals-restore/Imgae test (then you rename to "original source")
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const SOURCE1 = path.join(process.env.HOME || '', 'Desktop', '4ligths content');
const ORIGINAL_SOURCE_DIR = path.resolve(projectRoot, '4lights-originals-restore', 'original source');
const SOURCE2 = ORIGINAL_SOURCE_DIR; // existing originals (same as DEST after first run)
const DEST = ORIGINAL_SOURCE_DIR;

const IMG_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

function* walkFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'thumb' || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walkFiles(full, base);
    } else if (IMG_EXT.includes(path.extname(e.name).toLowerCase())) {
      const rel = path.relative(base, full);
      yield { full, rel };
    }
  }
}

function collectByRel(srcDir) {
  const map = new Map();
  for (const { full, rel } of walkFiles(srcDir)) {
    const stat = fs.statSync(full);
    const existing = map.get(rel);
    if (!existing || stat.size > existing.size) map.set(rel, { full, size: stat.size });
  }
  return map;
}

function main() {
  const sources = [];
  if (fs.existsSync(SOURCE1)) {
    sources.push({ name: 'SOURCE1 (4ligths content)', dir: SOURCE1 });
  }
  if (fs.existsSync(SOURCE2)) {
    sources.push({ name: 'SOURCE2 (originals-restore)', dir: SOURCE2 });
  }
  if (sources.length === 0) {
    console.error('Neither source exists. Create SOURCE1 or ensure SOURCE2 exists.');
    process.exit(1);
  }
  console.log('Merge sources:', sources.map(s => s.name).join(', '));
  console.log('Destination:', DEST);

  const byRel = new Map();
  for (const { dir } of sources) {
    for (const { full, rel } of walkFiles(dir)) {
      const stat = fs.statSync(full);
      const existing = byRel.get(rel);
      if (!existing || stat.size > existing.size) {
        byRel.set(rel, { full, size: stat.size });
      }
    }
  }

  fs.mkdirSync(DEST, { recursive: true });
  const destAbs = path.resolve(DEST);
  let copied = 0;
  for (const [rel, { full }] of byRel) {
    const destPath = path.join(DEST, rel);
    if (path.resolve(full) === path.resolve(destPath)) continue; // already in place
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(full, destPath);
    copied++;
  }
  console.log(`Done. ${byRel.size} unique files; ${copied} copied/updated.`);
}

main();
