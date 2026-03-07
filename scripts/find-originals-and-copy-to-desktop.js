#!/usr/bin/env node
/**
 * Search the Mac and connected external drives for copies of 4lights images
 * that match the same folder structure (final images/Folder/file.png).
 * Copies the LARGEST version found for each file (likely original before compression)
 * to ~/Desktop/4lights-originals-restore/ with the same folder structure.
 *
 * Excludes the current project folder so we don't re-copy compressed files.
 * Run: node scripts/find-originals-and-copy-to-desktop.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const pathsFile = path.join(projectRoot, 'scripts', '4lights-image-paths.txt');
const OUT_DIR = path.join(process.env.HOME || '', 'Desktop', '4lights-originals-restore');

const home = process.env.HOME || '';
const SEARCH_ROOTS = [home, '/Volumes'].filter((p) => p && fs.existsSync(p));
const MAX_DEPTH_HOME = 14;
const MAX_DEPTH_VOLUMES = 16;

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'Library', '.Trash', 'Applications', 'System',
  'Caches', '.cache', 'npm', 'yarn', 'tmp', 'temp', 'dist', '.next',
]);

const ROOT_FOLDER_NAME = 'final images';

function loadPaths() {
  if (!fs.existsSync(pathsFile)) {
    console.error('Run first: extract imagePaths to scripts/4lights-image-paths.txt');
    process.exit(1);
  }
  return fs.readFileSync(pathsFile, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
}

function findImgaeTestRoots(dir, depth, maxDepth, results) {
  if (depth > maxDepth) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (path.relative(projectRoot, full).startsWith('..') === false && full.startsWith(projectRoot)) continue;
    if (e.name === ROOT_FOLDER_NAME) {
      results.push(full);
      continue;
    }
    findImgaeTestRoots(full, depth + 1, maxDepth, results);
  }
}

function collectCandidates(imgaeTestRoots, relPaths) {
  const byRel = new Map();
  for (const relPath of relPaths) {
    if (!relPath.startsWith(ROOT_FOLDER_NAME + '/')) continue;
    const subPath = relPath.slice(ROOT_FOLDER_NAME.length + 1);
    for (const root of imgaeTestRoots) {
      const fullPath = path.join(root, subPath);
      try {
        const stat = fs.statSync(fullPath);
        if (!stat.isFile()) continue;
        const size = stat.size;
        if (!byRel.has(relPath)) byRel.set(relPath, []);
        byRel.get(relPath).push({ fullPath, size });
      } catch {
        // file not found or not readable
      }
    }
  }
  return byRel;
}

function main() {
  const relPaths = loadPaths();
  console.log('4lights: search for original images (same structure)\n');
  console.log('Image paths to find:', relPaths.length);
  console.log('Search roots:', SEARCH_ROOTS.join(', '));
  console.log('Output:', OUT_DIR);
  console.log('Excluding project:', projectRoot);
  console.log('');

  const imgaeTestRoots = [];
  for (const searchRoot of SEARCH_ROOTS) {
    if (searchRoot === '/Volumes') {
      try {
        const volumes = fs.readdirSync('/Volumes', { withFileTypes: true });
        for (const v of volumes) {
          if (v.name.startsWith('.')) continue;
          const volPath = path.join('/Volumes', v.name);
          findImgaeTestRoots(volPath, 0, MAX_DEPTH_VOLUMES, imgaeTestRoots);
        }
      } catch (e) {
        console.warn('Skip /Volumes:', e.message);
      }
    } else {
      findImgaeTestRoots(searchRoot, 0, MAX_DEPTH_HOME, imgaeTestRoots);
    }
  }

  const normalizedProject = path.resolve(projectRoot);
  const rootsOutsideProject = imgaeTestRoots.filter((r) => path.resolve(r) !== normalizedProject && !path.resolve(r).startsWith(normalizedProject + path.sep));
  console.log('Found', imgaeTestRoots.length, 'folder(s) named "final images"');
  console.log('Outside this project:', rootsOutsideProject.length);
  if (rootsOutsideProject.length > 0) {
    rootsOutsideProject.forEach((r) => console.log('  -', r));
  }
  console.log('');

  const byRel = collectCandidates(imgaeTestRoots, relPaths);

  let copied = 0;
  let notFound = 0;
  for (const relPath of relPaths) {
    const candidates = byRel.get(relPath) || [];
    const outside = candidates.filter((c) => {
      const res = path.resolve(c.fullPath);
      return res !== normalizedProject && !res.startsWith(normalizedProject + path.sep);
    });
    const fromProject = candidates.filter((c) => path.resolve(c.fullPath).startsWith(normalizedProject + path.sep) || path.resolve(c.fullPath) === normalizedProject);
    const best = outside.length ? outside.sort((a, b) => b.size - a.size)[0] : (fromProject.length ? fromProject.sort((a, b) => b.size - a.size)[0] : null);
    if (!best) {
      notFound++;
      continue;
    }
    const destFile = path.join(OUT_DIR, relPath);
    const destDir = path.dirname(destFile);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    try {
      fs.copyFileSync(best.fullPath, destFile);
      copied++;
      if (copied <= 5 || copied % 50 === 0) console.log('Copied', copied + ':', relPath);
    } catch (e) {
      console.warn('Failed to copy', relPath, e.message);
    }
  }

  console.log('\nDone.');
  console.log('Copied:', copied, 'files to', OUT_DIR);
  console.log('Not found anywhere:', notFound);
}

main();
