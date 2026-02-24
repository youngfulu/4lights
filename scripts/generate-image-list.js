#!/usr/bin/env node
/**
 * Generate image list from "Imgae test " folder using only web-displayable files
 * (.jpg, .jpeg, .png, .gif, .webp, .svg). Updates public/script.js with the new array.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const WEB_IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
// Only scan public/Imgae test so every listed image is actually served at /img/ (no 404s)
const IMAGE_DIRS = [
  path.join(projectRoot, 'public', 'Imgae test '),
];
// Fallback: if public folder missing, use project root (user must copy to public for /img to serve)
const FALLBACK_IMAGE_DIR = path.join(projectRoot, 'Imgae test ');

function getWebImagePaths(dir, baseDir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      results.push(...getWebImagePaths(full, baseDir));
    } else {
      const ext = path.extname(e.name).toLowerCase();
      if (WEB_IMAGE_EXT.includes(ext)) {
        const relative = path.relative(baseDir, full);
        const normalized = relative.split(path.sep).join('/');
        results.push(normalized);
      }
    }
  }
  return results;
}

function main() {
  const allPaths = new Set();
  let scanned = false;
  for (const imageDir of IMAGE_DIRS) {
    if (!fs.existsSync(imageDir)) continue;
    scanned = true;
    const baseDir = path.dirname(imageDir);
    const relDir = path.relative(projectRoot, imageDir);
    const files = getWebImagePaths(imageDir, baseDir);
    files.forEach((p) => allPaths.add(p));
    console.log(`Scanned ${relDir}: ${files.length} web images (all loadable via /img/)`);
  }
  if (!scanned && fs.existsSync(FALLBACK_IMAGE_DIR)) {
    console.warn('public/Imgae test not found; using project root Imgae test (copy to public for /img/ to serve).');
    const baseDir = path.dirname(FALLBACK_IMAGE_DIR);
    const files = getWebImagePaths(FALLBACK_IMAGE_DIR, baseDir);
    files.forEach((p) => allPaths.add(p));
    console.log(`Scanned Imgae test (root): ${files.length} web images`);
  }

  const sorted = Array.from(allPaths).sort();
  console.log(`Total unique web-displayable images: ${sorted.length}`);

  const scriptPath = path.join(projectRoot, 'public', 'script.js');
  let scriptContent = fs.readFileSync(scriptPath, 'utf8');

  const arrayStart = 'const imagePaths = [';
  const startIdx = scriptContent.indexOf(arrayStart);
  if (startIdx === -1) {
    console.error('Could not find "const imagePaths = [" in script.js');
    process.exit(1);
  }
  const afterStart = startIdx + arrayStart.length;
  const endIdx = scriptContent.indexOf('];', afterStart);
  if (endIdx === -1) {
    console.error('Could not find "];" closing imagePaths in script.js');
    process.exit(1);
  }

  const lines = sorted.map((p) => `    '${p.replace(/'/g, "\\'")}'`);
  const newBlock = arrayStart + '\n' + lines.join(',\n') + '\n];';
  const newScript =
    scriptContent.slice(0, startIdx) + newBlock + scriptContent.slice(endIdx + 2);
  fs.writeFileSync(scriptPath, newScript);
  console.log('Updated public/script.js with new imagePaths.');
}

main();
