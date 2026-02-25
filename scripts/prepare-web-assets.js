#!/usr/bin/env node
/**
 * Prepare web-only assets for commit: copy from root "Imgae test " to "public/Imgae test "
 * only web-displayable files (.jpg, .jpeg, .png, .gif, .webp, .svg) and about.txt.
 * Run before: npm run compress-images && npm run generate-image-list
 * Then: git add "public/Imgae test /" && git commit -m "Add web images"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const WEB_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
const ALLOW_FILES = ['about.txt', 'Extra.txt'];

const SOURCE = path.join(projectRoot, 'Imgae test ');
const TARGET = path.join(projectRoot, 'public', 'Imgae test ');

function shouldCopy(name) {
  const ext = path.extname(name).toLowerCase();
  const base = path.basename(name);
  if (WEB_EXT.includes(ext)) return true;
  if (ALLOW_FILES.includes(base)) return true;
  return false;
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return { files: 0, dirs: 0 };
  fs.mkdirSync(dest, { recursive: true });
  let files = 0, dirs = 0;
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, e.name);
    const destPath = path.join(dest, e.name);
    if (e.isDirectory()) {
      copyDir(srcPath, destPath);
      dirs++;
    } else if (shouldCopy(e.name)) {
      fs.copyFileSync(srcPath, destPath);
      files++;
    }
  }
  return { files, dirs };
}

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.log('Root "Imgae test " not found; nothing to copy.');
    process.exit(0);
  }
  if (fs.existsSync(TARGET)) {
    fs.rmSync(TARGET, { recursive: true });
  }
  console.log('Copying web-only files to public/Imgae test /...');
  const { files } = copyDir(SOURCE, TARGET);
  console.log(`Copied ${files} web/allowlisted files.`);
  console.log('Next: npm run compress-images && npm run generate-image-list');
  console.log('Then: git add "public/Imgae test /" && git commit -m "Add web images"');
}

main();
