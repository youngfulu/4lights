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
// Only scan public/Imgae test — root "Imgae test " is ignored so grid uses only served images
const IMAGE_DIR = path.join(projectRoot, 'public', 'Imgae test ');

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
  if (!fs.existsSync(IMAGE_DIR)) {
    console.error('public/Imgae test not found. Only this folder is scanned; root files are ignored.');
    process.exit(1);
  }
  const baseDir = path.dirname(IMAGE_DIR);
  const files = getWebImagePaths(IMAGE_DIR, baseDir);
  files.forEach((p) => allPaths.add(p));
  console.log(`Scanned public/Imgae test: ${files.length} web images (root Imgae test ignored)`);

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
