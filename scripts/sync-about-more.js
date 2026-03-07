#!/usr/bin/env node
/**
 * Sync about.txt and more.txt from reference (final images) to public/final images
 * so project folders in public have up-to-date text files.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const REFERENCE = path.join(projectRoot, 'final images');
const PUBLIC_IMG = path.join(projectRoot, 'public', 'final images');
const FILES = ['about.txt', 'more.txt'];

function main() {
  if (!fs.existsSync(REFERENCE) || !fs.existsSync(PUBLIC_IMG)) {
    console.error('Reference or public final images not found.');
    process.exit(1);
  }
  let copied = 0;
  const pubFolders = fs.readdirSync(PUBLIC_IMG, { withFileTypes: true }).filter(d => d.isDirectory());
  const refFolders = fs.readdirSync(REFERENCE, { withFileTypes: true }).filter(d => d.isDirectory() && !d.name.startsWith('.'));
  for (const d of refFolders) {
    const refDir = path.join(REFERENCE, d.name);
    let pubDir = path.join(PUBLIC_IMG, d.name);
    if (!fs.existsSync(pubDir)) {
      const match = pubFolders.find(p => p.name === d.name || p.name.startsWith(d.name) || d.name.startsWith(p.name));
      if (match) pubDir = path.join(PUBLIC_IMG, match.name);
      else continue;
    }
    for (const f of FILES) {
      const src = path.join(refDir, f);
      const dest = path.join(pubDir, f);
      if (fs.existsSync(src)) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
        copied++;
      }
    }
  }
  console.log(`Synced ${copied} about.txt/more.txt from reference to public.`);
}

main();
