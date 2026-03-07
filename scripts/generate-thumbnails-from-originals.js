#!/usr/bin/env node
/**
 * Generate thumbnails from 4lights-originals-restore (preserve aspect ratio).
 * Output: 4lights-originals-restore/thumb/ with same folder structure.
 * Does not modify originals. Max width 400px for fast grid loading.
 *
 * Run: node scripts/generate-thumbnails-from-originals.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const ORIGINALS_ROOT = path.join(projectRoot, '4lights-originals-restore');
const IMGAE_TEST = path.join(ORIGINALS_ROOT, 'final images');
const THUMB_ROOT = path.join(ORIGINALS_ROOT, 'thumb');
const MAX_WIDTH = 400;
const JPEG_QUALITY = 82;
const PNG_QUALITY = 80;

function getAllImagePaths(dir, base = dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      results.push(...getAllImagePaths(full, base));
    } else {
      const ext = path.extname(full).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
        results.push(full);
      }
    }
  }
  return results;
}

async function main() {
  if (!fs.existsSync(IMGAE_TEST)) {
    console.error('Originals not found at:', IMGAE_TEST);
    process.exit(1);
  }

  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error('sharp not installed. Run: npm install');
    process.exit(1);
  }

  const files = getAllImagePaths(IMGAE_TEST);
  console.log('4lights: thumbnails from originals (aspect ratio preserved, max width', MAX_WIDTH + 'px)');
  console.log('Source:', IMGAE_TEST);
  console.log('Output:', THUMB_ROOT);
  console.log('Total images:', files.length, '\n');

  let done = 0;
  let errors = 0;
  for (const filePath of files) {
    const rel = path.relative(IMGAE_TEST, filePath);
    const thumbPath = path.join(THUMB_ROOT, rel);
    const thumbDir = path.dirname(thumbPath);
    const ext = path.extname(filePath).toLowerCase();

    try {
      fs.mkdirSync(thumbDir, { recursive: true });
      const img = sharp(filePath);
      const meta = await img.metadata();
      const w = meta.width || 0;
      const h = meta.height || 0;
      if (w <= 0 || h <= 0) {
        console.warn('  skip (no size):', rel);
        continue;
      }
      const needResize = w > MAX_WIDTH;
      let pipeline = img;
      if (needResize) {
        pipeline = pipeline.resize(MAX_WIDTH, null, { withoutEnlargement: true });
      }
      if (['.jpg', '.jpeg'].includes(ext)) {
        await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(thumbPath);
      } else if (ext === '.png') {
        await pipeline.png({ quality: PNG_QUALITY, compressionLevel: 9 }).toFile(thumbPath);
      } else if (ext === '.webp') {
        await pipeline.webp({ quality: 82 }).toFile(thumbPath);
      } else if (ext === '.gif') {
        await pipeline.gif().toFile(thumbPath);
      } else {
        fs.copyFileSync(filePath, thumbPath);
      }
      done++;
      if (done % 30 === 0) console.log('  ', done + '/' + files.length);
    } catch (err) {
      errors++;
      console.warn('  ✗', rel, err.message);
    }
  }

  console.log('\nDone:', done, 'thumbnails,', errors, 'errors.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
