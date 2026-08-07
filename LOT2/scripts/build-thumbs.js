#!/usr/bin/env node
/**
 * LOT2: Build index/hover thumbnails from final images source.
 * Run from LOT2 folder: node scripts/build-thumbs.js
 *
 * Reads ../final images (never writes to it) and emits webp thumbs into
 * LOT2/.thumbs, which vite copies to dist/img/thumb at build time.
 * Output name keeps the original filename and appends .webp, so `a.png`
 * and `a.jpg` in one folder stay distinct — matches imageUrl() in App.jsx.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOT2_ROOT = path.resolve(__dirname, '..');
const IMAGE_SOURCE = path.resolve(LOT2_ROOT, '..', 'final images');
const THUMB_OUT = path.resolve(LOT2_ROOT, '.thumbs');

const SRC_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
// Sized for the largest place a thumb is shown: the desktop hover preview is
// min(680px, 44vw) wide, so ~1360 device px on a 2x screen. Anything much
// smaller visibly upscales. Height cap keeps portraits from losing width.
const THUMB_WIDTH = 1000;
const THUMB_HEIGHT = 1400;
const THUMB_QUALITY = 82;
const THUMB_FALLBACK_QUALITY = 68;
const CONCURRENCY = 8;

/** Source files needing a thumb, paired with their output path. */
function collectJobs(absDir, relPrefix = '') {
  const out = [];
  if (!fs.existsSync(absDir)) return out;
  for (const e of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (e.name === '.DS_Store') continue;
    // `0_` folders are hidden from the index by build-data.js — no thumbs needed.
    if (!relPrefix && (e.name === 'thumb' || e.name.startsWith('0_'))) continue;
    const rel = relPrefix ? `${relPrefix}/${e.name}` : e.name;
    const full = path.join(absDir, e.name);
    if (e.isDirectory()) {
      out.push(...collectJobs(full, rel));
    } else if (SRC_EXT.has(path.extname(e.name).toLowerCase())) {
      out.push({ src: full, dest: path.join(THUMB_OUT, `${rel}.webp`) });
    }
  }
  return out;
}

/** Skip work when an existing thumb is newer than its source. */
function isFresh(src, dest) {
  if (!fs.existsSync(dest)) return false;
  return fs.statSync(dest).mtimeMs >= fs.statSync(src).mtimeMs;
}

function encode(src, quality) {
  return sharp(src, { failOn: 'none' })
    .rotate()
    // Bound both sides so tall panoramas can't produce a huge "thumb".
    .resize({ width: THUMB_WIDTH, height: THUMB_HEIGHT, fit: 'inside', withoutEnlargement: true })
    .webp({ quality, effort: 5 })
    .toBuffer();
}

async function makeThumb(job) {
  let buf = await encode(job.src, THUMB_QUALITY);
  // Flat/graphic sources (screenshots, renders) can compress better as the
  // original PNG than as lossy webp. A thumb must never cost more than what
  // it stands in for, so back off the quality when that happens.
  const srcSize = fs.statSync(job.src).size;
  if (buf.length >= srcSize) {
    const fallback = await encode(job.src, THUMB_FALLBACK_QUALITY);
    if (fallback.length < buf.length) buf = fallback;
  }
  fs.mkdirSync(path.dirname(job.dest), { recursive: true });
  fs.writeFileSync(job.dest, buf);
  return buf.length;
}

async function runPool(jobs) {
  let next = 0;
  let built = 0;
  let failed = 0;
  let bytes = 0;
  async function worker() {
    while (next < jobs.length) {
      const job = jobs[next++];
      try {
        // Read-modify-write must happen after the await, or concurrent
        // workers clobber each other's totals.
        const size = await makeThumb(job);
        bytes += size;
        built++;
      } catch (err) {
        failed++;
        console.warn('LOT2: thumb failed', path.relative(IMAGE_SOURCE, job.src), '-', err.message);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return { built, failed, bytes };
}

async function main() {
  if (!fs.existsSync(IMAGE_SOURCE)) {
    console.warn('LOT2: no image source at', IMAGE_SOURCE, '- skipping thumbs');
    return;
  }
  const all = collectJobs(IMAGE_SOURCE);
  const stale = all.filter((j) => !isFresh(j.src, j.dest));
  if (!stale.length) {
    console.log('LOT2:', all.length, 'thumbs already up to date in', THUMB_OUT);
    return;
  }
  const { built, failed, bytes } = await runPool(stale);
  console.log('LOT2: image source =', IMAGE_SOURCE);
  console.log(
    `LOT2: built ${built} thumbs (${(bytes / 1024 / 1024).toFixed(2)} MB total, ${all.length - stale.length} cached, ${failed} failed) -> ${THUMB_OUT}`,
  );
}

main();
