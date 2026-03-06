import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Image folder: use folder with more images when both exist (match generate-image-list)
const WEB_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
function countWebImages(dir) {
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'thumb') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) n += countWebImages(full);
    else if (WEB_EXT.includes(path.extname(e.name).toLowerCase())) n += 1;
  }
  return n;
}
const IMG_SOURCE =
  (() => {
    const root = path.resolve(process.cwd(), 'final images');
    const pub = path.resolve(process.cwd(), 'public', 'final images');
    const rootExists = fs.existsSync(root);
    const pubExists = fs.existsSync(pub);
    if (rootExists && pubExists) {
      return countWebImages(pub) >= countWebImages(root) ? pub : root;
    }
    if (rootExists) return root;
    if (pubExists) return pub;
    return pub; // default for build
  })();
const THUMB_SOURCE = path.resolve(process.cwd(), 'thumb');

export default defineConfig(({ command }) => {
  const isProd = command === 'build';
  const base = isProd ? './' : '/';
  return {
  base,
  plugins: [
      react(),
      // Dev: serve "final images" at /img/; thumb from project root "thumb" at /img/thumb/
      {
        name: 'serve-img-folder',
        configureServer(server) {
          server.middlewares.use('/img', (req, res, next) => {
            let raw = (req.url || '').split('?')[0].replace(/^\//, '');
            if (raw.startsWith('img/')) raw = raw.slice(4); else if (raw.startsWith('img')) raw = raw.slice(3).replace(/^\//, '') || '';
            const segments = raw.split('/').map(s => {
              try { return decodeURIComponent(s.replace(/%2523/g, '%23')); } catch { return s; }
            });
            const urlPath = segments.join(path.sep).replace(/%23/g, '#');
            const thumbPrefix = /^thumb[/\\]/;
            let filePath;
            const relPath = urlPath.replace(/^thumb[/\\]?/, '');
            if (thumbPrefix.test(urlPath) && fs.existsSync(THUMB_SOURCE)) {
              filePath = path.join(THUMB_SOURCE, relPath);
              if (!path.resolve(filePath).startsWith(path.resolve(THUMB_SOURCE))) return next();
              if (!fs.existsSync(filePath) && fs.existsSync(IMG_SOURCE)) {
                const fp = path.join(IMG_SOURCE, relPath);
                if (fs.existsSync(fp)) filePath = fp;
              }
            } else {
              if (!fs.existsSync(IMG_SOURCE)) return next();
              filePath = path.join(IMG_SOURCE, urlPath);
              if (!path.resolve(filePath).startsWith(path.resolve(IMG_SOURCE))) return next();
            }
            filePath = path.normalize(path.resolve(filePath));
            if (!fs.existsSync(filePath)) {
              res.statusCode = 404;
              res.end();
              return;
            }
            const stat = fs.statSync(filePath);
            if (!stat.isFile()) {
              res.statusCode = 404;
              res.end();
              return;
            }
            fs.readFile(filePath, (err, data) => {
              if (err) return next();
              const ext = path.extname(filePath).toLowerCase();
              const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.txt': 'text/plain' };
              res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
              res.end(data);
            });
          });
        },
      },
      // Build: copy final images + thumb to dist/img
      {
        name: 'copy-img-to-dist',
        closeBundle() {
          try {
            const outDir = path.resolve(process.cwd(), 'dist');
            const imgDest = path.join(outDir, 'img');
            // Encode # as %23 in names so URL path (with double-encoded #) matches filesystem
            function safeName(name) {
              return name.replace(/#/g, '%23');
            }
            function copyRecursive(src, dest) {
              fs.mkdirSync(dest, { recursive: true });
              for (const e of fs.readdirSync(src, { withFileTypes: true })) {
                const s = path.join(src, e.name);
                const d = path.join(dest, safeName(e.name));
                if (e.isDirectory()) copyRecursive(s, d);
                else fs.copyFileSync(s, d);
              }
            }
            if (fs.existsSync(IMG_SOURCE)) copyRecursive(IMG_SOURCE, imgDest);
            if (fs.existsSync(THUMB_SOURCE)) copyRecursive(THUMB_SOURCE, path.join(imgDest, 'thumb'));
          } catch (err) {
            console.warn('copy-img-to-dist:', err.message);
          }
        },
      },
    ],
    root: '.',
    publicDir: 'public',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    },
  };
});
