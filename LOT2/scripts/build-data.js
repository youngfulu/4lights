#!/usr/bin/env node
/**
 * LOT2: Build project data from repository image sources.
 * Run from LOT2 folder: node scripts/build-data.js
 * Prefers ../dist/img, then falls back to ../final images, then ../public/final images.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOT2_ROOT = path.resolve(__dirname, '..');
const IMAGE_SOURCE_CANDIDATES = [
  path.resolve(LOT2_ROOT, '..', 'dist', 'img'),
  path.resolve(LOT2_ROOT, '..', 'final images'),
  path.resolve(LOT2_ROOT, '..', 'public', 'final images'),
];
const WEB_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']);

function pickImageSource() {
  for (const candidate of IMAGE_SOURCE_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return IMAGE_SOURCE_CANDIDATES[0];
}

function deriveTags(name) {
  const n = (name || '').toLowerCase();
  const tags = [];
  if (n.includes('#stage')) tags.push('stage');
  if (n.includes('#instal') || n.includes('#installation')) tags.push('installation');
  if (n.includes('#concept')) tags.push('concept');
  if (n.includes('#tech')) tags.push('tech');
  if (n.includes('#spatial')) tags.push('spatial');
  return tags;
}

function displayName(folderName) {
  return folderName.replace(/\s*#\w+(\s*#\w+)*\s*$/i, '').trim() || folderName;
}

function parseAboutForIndex(aboutPath) {
  let location = '';
  let city = '';
  let year = '';
  if (!fs.existsSync(aboutPath)) return { location, city, year };
  const text = fs.readFileSync(aboutPath, 'utf8');
  const locMatch = text.match(/(?:location|Location):\s*\(?([^)\n\r]+)\)?/i);
  const yearMatch = text.match(/(?:year|Year):\s*\(?([^)\n\r]+)\)?/i);
  if (locMatch) location = locMatch[1].trim();
  if (yearMatch) year = yearMatch[1].trim();
  if (location) {
    // Keep only the first part (usually "City" before the country after comma).
    city = location.split(',')[0].trim().replace(/\.+$/, '');
  }
  return { location, city, year };
}

function scanFolders(dir, basePath = '') {
  const list = [];
  if (!fs.existsSync(dir)) return list;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'thumb' || e.name.startsWith('0_') || e.name === '.DS_Store') continue;
    const full = path.join(dir, e.name);
    const rel = basePath ? basePath + '/' + e.name : e.name;
    if (e.isDirectory()) {
      const images = [];
      let hasAbout = false;
      let hasMore = false;
      for (const f of fs.readdirSync(full, { withFileTypes: true })) {
        if (f.isDirectory()) continue;
        const ext = path.extname(f.name).toLowerCase();
        if (WEB_EXT.has(ext)) images.push(f.name);
        if (f.name === 'about.txt') hasAbout = true;
        if (f.name === 'more.txt') hasMore = true;
      }
      if (images.length) {
        const aboutPath = path.join(full, 'about.txt');
        images.sort((a, b) => a.localeCompare(b));
        const { location, city, year } = parseAboutForIndex(aboutPath);
        // If an image is marked for index preview, prefer it; otherwise use any image.
        // Marker: filename contains "ind_name"
        const indexImage =
          images.find((img) => img.toLowerCase().includes('ind_name')) || images[0];
        list.push({
          path: rel,
          name: displayName(e.name),
          rawName: e.name,
          images,
          hasAbout,
          hasMore,
          tags: deriveTags(e.name),
          location,
          city,
          year,
          indexImage,
        });
      }
    }
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

function main() {
  const imageSource = pickImageSource();
  const folders = scanFolders(imageSource);
  const dest = path.join(LOT2_ROOT, 'public', 'data', 'projects.json');
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(dest, JSON.stringify({ folders, imageBase: '/img' }, null, 2), 'utf8');
  console.log('LOT2: image source =', imageSource);
  console.log('LOT2: wrote', folders.length, 'projects to', dest);
}

main();
