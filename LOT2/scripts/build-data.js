#!/usr/bin/env node
/**
 * LOT2: Build project data from final images source.
 * Run from LOT2 folder: node scripts/build-data.js
 * Uses only ../final images.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOT2_ROOT = path.resolve(__dirname, '..');
const IMAGE_SOURCE = path.resolve(LOT2_ROOT, '..', 'final images');
const WEB_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']);

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

/** All web images under project folder, with paths relative to project (nested ok). Skips `thumb/` trees. */
function collectWebImagesRecursive(absDir, relPrefix = '') {
  const out = [];
  if (!fs.existsSync(absDir)) return out;
  for (const f of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (f.name === '.DS_Store') continue;
    const rel = relPrefix ? `${relPrefix}/${f.name}` : f.name;
    const full = path.join(absDir, f.name);
    if (f.isDirectory()) {
      if (f.name === 'thumb') continue;
      out.push(...collectWebImagesRecursive(full, rel));
    } else if (WEB_EXT.has(path.extname(f.name).toLowerCase())) {
      out.push(rel.split(path.sep).join('/'));
    }
  }
  return out;
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
      let hasAbout = false;
      let hasMore = false;
      for (const f of fs.readdirSync(full, { withFileTypes: true })) {
        if (!f.isFile()) continue;
        if (f.name === 'about.txt') hasAbout = true;
        if (f.name === 'more.txt') hasMore = true;
      }
      const images = collectWebImagesRecursive(full);
      if (images.length) {
        const aboutPath = path.join(full, 'about.txt');
        images.sort((a, b) => a.localeCompare(b));
        const { location, city, year } = parseAboutForIndex(aboutPath);
        // Index preview priority:
        // 1) any image whose leaf name starts with "ind_" (nested paths ok)
        // 2) legacy marker "ind_name" in leaf name
        // 3) first image in sorted list
        const leaf = (p) => (p.includes('/') ? p.split('/').pop() : p) || p;
        const indexImage =
          images.find((img) => /^ind_/i.test(leaf(img))) ||
          images.find((img) => leaf(img).toLowerCase().includes('ind_name')) ||
          images[0];
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
  const imageSource = IMAGE_SOURCE;
  const folders = scanFolders(imageSource);
  const dest = path.join(LOT2_ROOT, 'public', 'data', 'projects.json');
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(dest, JSON.stringify({ folders, imageBase: '/img' }, null, 2), 'utf8');
  console.log('LOT2: image source =', imageSource);
  console.log('LOT2: wrote', folders.length, 'projects to', dest);
}

main();
