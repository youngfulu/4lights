#!/usr/bin/env node
/**
 * Read scripts/compressed-images-list.txt and optionally delete those files
 * from public/final images (and final images). Use after marking compressed images.
 * Run with --delete to actually remove files; without it only lists.
 *
 * Usage:
 *   node scripts/mark-and-delete-compressed.js       # list only
 *   node scripts/mark-and-delete-compressed.js --delete  # delete listed files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const LIST_FILE = path.join(projectRoot, 'scripts', 'compressed-images-list.txt');
const IMAGE_DIRS = [
  path.join(projectRoot, 'public', 'final images'),
  path.join(projectRoot, 'final images'),
];

function getLines() {
  if (!fs.existsSync(LIST_FILE)) return [];
  const content = fs.readFileSync(LIST_FILE, 'utf8');
  return content
    .split(/\n/)
    .map((s) => s.replace(/#.*$/, '').trim())
    .filter(Boolean);
}

function main() {
  const doDelete = process.argv.includes('--delete');
  const lines = getLines();
  if (lines.length === 0) {
    console.log('No paths in scripts/compressed-images-list.txt. Add paths (one per line) to mark compressed images.');
    process.exit(0);
  }

  console.log(doDelete ? 'Deleting compressed images:' : 'Would delete (run with --delete to remove):');
  let deleted = 0;
  for (const imageDir of IMAGE_DIRS) {
    if (!fs.existsSync(imageDir)) continue;
    for (const rel of lines) {
      const filePath = path.join(imageDir, rel.replace(/\//g, path.sep));
      if (!fs.existsSync(filePath)) continue;
      if (!fs.statSync(filePath).isFile()) continue;
      console.log('  ', path.relative(projectRoot, filePath));
      if (doDelete) {
        try {
          fs.unlinkSync(filePath);
          deleted++;
        } catch (err) {
          console.warn('    error:', err.message);
        }
      }
    }
  }
  if (doDelete) console.log('\nDeleted:', deleted, 'files.');
  else console.log('\nTotal listed:', lines.length, '- run with --delete to remove.');
}

main();
