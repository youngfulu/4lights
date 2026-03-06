#!/usr/bin/env node
/**
 * Generate image list from "final images" folder using only web-displayable files
 * (.jpg, .jpeg, .png, .gif, .webp, .svg). Updates public/script.js with the new array.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const WEB_IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
const ROOT_IMAGE_DIR = path.join(projectRoot, 'final images');
const PUBLIC_IMAGE_DIR = path.join(projectRoot, 'public', 'final images');

const THUMB_DIR_NAME = 'thumb';

function getWebImagePaths(dir, baseDir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory() && (e.name === THUMB_DIR_NAME || e.name.startsWith('0_'))) continue;
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
  // Reference for deploy = root final images; fallback to public
  const rootExists = fs.existsSync(ROOT_IMAGE_DIR);
  const publicExists = fs.existsSync(PUBLIC_IMAGE_DIR);
  const imageDir = rootExists ? ROOT_IMAGE_DIR : PUBLIC_IMAGE_DIR;
  const baseDir = path.dirname(imageDir);
  if (!fs.existsSync(imageDir)) {
    console.error('Neither final images nor public/final images found.');
    process.exit(1);
  }
  const files = getWebImagePaths(imageDir, baseDir);
  files.forEach((p) => allPaths.add(p));
  console.log(`Scanned ${imageDir === ROOT_IMAGE_DIR ? 'final images (root)' : 'public/final images'}: ${files.length} web images`);

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
