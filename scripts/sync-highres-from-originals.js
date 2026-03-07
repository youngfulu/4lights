#!/usr/bin/env node
/**
 * Copy originals from "original source" into public/final images/FolderName/highres/
 * so selection mode can load high-res. Reference = project root final images (file list).
 * If an original doesn't exist, skip (app will use full-res).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const REFERENCE = path.join(projectRoot, 'final images');
const ORIGINAL_SOURCE = path.join(projectRoot, '4lights-originals-restore', 'original source');
const PUBLIC_IMG = path.join(projectRoot, 'public', 'final images');
const THUMB = 'thumb';
const IMG_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

function* refImageRels() {
  if (!fs.existsSync(REFERENCE)) return;
  for (const e of fs.readdirSync(REFERENCE, { withFileTypes: true })) {
    if (e.name === THUMB || e.name.startsWith('.')) continue;
    const folderPath = path.join(REFERENCE, e.name);
    if (!e.isDirectory()) continue;
    for (const f of fs.readdirSync(folderPath, { withFileTypes: true })) {
      if (!f.isFile()) continue;
      const ext = path.extname(f.name).toLowerCase();
      if (!IMG_EXT.includes(ext)) continue;
      yield { folder: e.name, file: f.name, rel: `${e.name}/${f.name}` };
    }
  }
}

function findOriginalPath(refFolder, file) {
  const exact = path.join(ORIGINAL_SOURCE, refFolder, file);
  if (fs.existsSync(exact)) return exact;
  const origFolders = fs.readdirSync(ORIGINAL_SOURCE, { withFileTypes: true }).filter(d => d.isDirectory());
  for (const d of origFolders) {
    const n = d.name.normalize('NFC');
    const r = refFolder.normalize('NFC');
    if (n === r) continue; // already tried
    if (n.startsWith(r) || r.startsWith(n) || n.replace(/\s+/g, '').includes(r.replace(/\s+/g, ''))) {
      const p = path.join(ORIGINAL_SOURCE, d.name, file);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

function main() {
  if (!fs.existsSync(ORIGINAL_SOURCE)) {
    console.error('original source not found:', ORIGINAL_SOURCE);
    process.exit(1);
  }
  fs.mkdirSync(PUBLIC_IMG, { recursive: true });
  let copied = 0;
  let skipped = 0;
  for (const { folder, file } of refImageRels()) {
    const srcPath = findOriginalPath(folder, file);
    if (!srcPath) {
      skipped++;
      continue;
    }
    const highresDir = path.join(PUBLIC_IMG, folder, 'highres');
    const destPath = path.join(highresDir, file);
    fs.mkdirSync(highresDir, { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    copied++;
  }
  console.log(`Highres: ${copied} copied to public/final images/.../highres/, ${skipped} skipped (no original).`);
}

main();
