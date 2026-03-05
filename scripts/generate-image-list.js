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
const ROOT_IMAGE_DIR = path.join(projectRoot, 'Imgae test ');
const PUBLIC_IMAGE_DIR = path.join(projectRoot, 'public', 'Imgae test ');

const THUMB_DIR_NAME = 'thumb';

function getWebImagePaths(dir, baseDir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory() && e.name === THUMB_DIR_NAME) continue;
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
  // Prefer public/Imgae test so list matches repo and deploy; fallback to root for local-only
  const imageDir = fs.existsSync(PUBLIC_IMAGE_DIR)
    ? PUBLIC_IMAGE_DIR
    : ROOT_IMAGE_DIR;
  const baseDir = path.dirname(imageDir);
  if (!fs.existsSync(imageDir)) {
    console.error('Neither Imgae test nor public/Imgae test found.');
    process.exit(1);
  }
  const files = getWebImagePaths(imageDir, baseDir);
  files.forEach((p) => allPaths.add(p));
  console.log(`Scanned ${imageDir === ROOT_IMAGE_DIR ? 'Imgae test (root)' : 'public/Imgae test'}: ${files.length} web images`);

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
